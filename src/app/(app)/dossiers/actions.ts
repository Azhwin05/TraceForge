"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth, requireRole } from "@/lib/auth"
import { dossierSchema } from "@/lib/validations/dossier"
import { sendDossierEmail } from "@/lib/email"
import { sanitizeError } from "@/lib/security"
import type { DossierStatus, Document as DocRecord, DocumentType, CustomerDossier } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
// Sort order for document types in dossier
// ─────────────────────────────────────────────────────────────────────────────
const DOC_SORT_ORDER: Partial<Record<DocumentType, number>> = {
  overlay_welding_report: 10,
  pmi_report:             20,
  dimension_report:       30,
  pwht_chart:             40,
  wps_pdf:                50,
  pqr_pdf:                60,
  dispatch_doc:           70,
  customer_drawing:       80,
  calibration_cert:       90,
  customer_po:           100,
}

// ─────────────────────────────────────────────────────────────────────────────
// createDossier
// ─────────────────────────────────────────────────────────────────────────────
export type CreateDossierResult =
  | { data: { id: string }; error: null }
  | { data: null; error: string }

export async function createDossier(
  jobCardId: string,
  raw: unknown,
): Promise<CreateDossierResult> {
  const session = await requireRole(["admin", "qa"])
  if (session.error) return { data: null, error: session.error }
  const { user, supabase } = session

  const parsed = dossierSchema.safeParse(raw)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }
  const d = parsed.data

  // Verify the documents belong to this job card and are active
  const { data: validDocs } = await supabase
    .from("documents")
    .select("id, document_type, document_name, file_name, version")
    .in("id", d.document_ids)
    .eq("job_card_id", jobCardId)
    .eq("is_active", true)

  const validDocList = (validDocs ?? []) as Pick<DocRecord, "id" | "document_type" | "document_name" | "file_name" | "version">[]
  const validIds = new Set(validDocList.map((doc) => doc.id))

  const invalidIds = d.document_ids.filter((id) => !validIds.has(id))
  if (invalidIds.length > 0) {
    return { data: null, error: "One or more selected documents do not belong to this job card or are archived." }
  }
  if (validDocList.length === 0) {
    return { data: null, error: "No valid documents selected." }
  }

  // Create the dossier record
  const { data: dossier, error: dossierErr } = await supabase
    .from("customer_dossiers")
    .insert({
      job_card_id:    jobCardId,
      dossier_number: d.dossier_number,
      dossier_date:   d.dossier_date,
      customer_name:  d.customer_name,
      po_number:      d.po_number,
      nbdn_number:    d.nbdn_number,
      drawing_number: d.drawing_number,
      heat_number:    d.heat_number,
      prepared_by:    d.prepared_by,
      approved_by:    d.approved_by,
      remarks:        d.remarks,
      status:         "draft" as DossierStatus,
      created_by:     user.id,
    })
    .select("id")
    .single()

  if (dossierErr || !dossier) {
    return { data: null, error: dossierErr?.message ?? "Failed to create dossier" }
  }

  // Create dossier-document link rows
  const linkRows = validDocList.map((doc) => ({
    dossier_id:    dossier.id,
    document_id:   doc.id,
    document_type: doc.document_type,
    document_name: doc.document_name ?? doc.file_name,
    version:       doc.version,
    sort_order:    DOC_SORT_ORDER[doc.document_type as DocumentType] ?? 200,
    included:      true,
  }))

  const { error: linkErr } = await supabase
    .from("customer_dossier_documents")
    .insert(linkRows)

  if (linkErr) {
    // Roll back the dossier record
    await supabase.from("customer_dossiers").delete().eq("id", dossier.id)
    return { data: null, error: `Failed to link documents: ${linkErr.message}` }
  }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/dossiers")

  return { data: { id: dossier.id }, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// markDossierSubmitted
// ─────────────────────────────────────────────────────────────────────────────
export async function markDossierSubmitted(
  id: string,
  submittedBy: string,
): Promise<{ error: string | null }> {
  const session = await requireRole(["admin", "qa"])
  if (session.error) return { error: session.error }
  const { supabase } = session

  const { data: dossier } = await supabase
    .from("customer_dossiers")
    .select("id, status")
    .eq("id", id)
    .single()

  if (!dossier) return { error: "Dossier not found" }
  if (dossier.status !== "generated") return { error: "Dossier must be in 'generated' status before submitting" }

  const { error } = await supabase
    .from("customer_dossiers")
    .update({
      status:               "submitted" as DossierStatus,
      submitted_to_customer: true,
      submitted_at:         new Date().toISOString(),
      submitted_by:         submittedBy.trim() || null,
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath(`/dossiers/${id}`)
  revalidatePath("/dossiers")
  return { error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// emailDossierToCustomer — automated documentation delivery
// Generates 7-day signed URLs for the index PDF + ZIP pack and emails them to
// the customer. Audit-logged via the log_document_dispatch RPC.
// ─────────────────────────────────────────────────────────────────────────────
const emailDossierSchema = z.object({
  dossierId: z.string().uuid("Invalid dossier ID"),
  to: z.string().email("A valid recipient email is required"),
  message: z.string().max(2000).optional(),
})

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 3600 // 7 days

export async function emailDossierToCustomer(raw: unknown): Promise<{ error?: string; sentTo?: string }> {
  const session = await requireRole(["admin", "qa"])
  if (session.error) return { error: session.error }
  const { supabase, user, profile } = session

  const parsed = emailDossierSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  }
  const { dossierId, to, message } = parsed.data

  try {
    // Fetch dossier — must be generated (or already submitted for a re-send)
    const { data: rawDossier } = await supabase
      .from("customer_dossiers")
      .select("*")
      .eq("id", dossierId)
      .single()

    if (!rawDossier) return { error: "Dossier not found" }
    const dossier = rawDossier as CustomerDossier

    if (!["generated", "submitted"].includes(dossier.status)) {
      return { error: "The dossier must be generated before it can be emailed." }
    }
    if (!dossier.generated_zip_path && !dossier.generated_index_pdf_path) {
      return { error: "No generated files found — regenerate the dossier first." }
    }

    // Job card number for the email subject
    const { data: jc } = await supabase
      .from("job_cards")
      .select("jc_number")
      .eq("id", dossier.job_card_id)
      .single()

    // Included document list for the email body
    const { data: dossierDocs } = await supabase
      .from("customer_dossier_documents")
      .select("document_name, document_type, included")
      .eq("dossier_id", dossierId)
      .order("sort_order")

    const documents = ((dossierDocs ?? []) as Array<{ document_name: string | null; document_type: string | null; included: boolean }>)
      .filter((d) => d.included)
      .map((d) => ({ name: d.document_name ?? "Document", type: d.document_type ?? "other" }))

    // Signed URLs (7-day)
    let indexUrl: string | null = null
    let zipUrl: string | null = null
    if (dossier.generated_index_pdf_path) {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(dossier.generated_index_pdf_path, SIGNED_URL_TTL_SECONDS)
      indexUrl = data?.signedUrl ?? null
    }
    if (dossier.generated_zip_path) {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(dossier.generated_zip_path, SIGNED_URL_TTL_SECONDS)
      zipUrl = data?.signedUrl ?? null
    }
    if (!indexUrl && !zipUrl) {
      return { error: "Could not create download links for the generated files." }
    }

    // Send
    const sendResult = await sendDossierEmail({
      to,
      dossierNumber: dossier.dossier_number,
      jcNumber: (jc as { jc_number: string } | null)?.jc_number ?? "—",
      customerName: dossier.customer_name ?? "Customer",
      poNumber: dossier.po_number,
      documents,
      indexUrl,
      zipUrl,
      message: message ?? null,
      sentBy: profile.full_name ?? "ValveTrack",
    })
    if (sendResult.error) return { error: sendResult.error }

    // Record on the dossier + audit trail
    await supabase
      .from("customer_dossiers")
      .update({
        email_sent_to: to,
        email_sent_at: new Date().toISOString(),
        email_sent_by: user.id,
      })
      .eq("id", dossierId)

    const { error: auditErr } = await supabase.rpc("log_document_dispatch", {
      p_entity_type: "dossier",
      p_entity_id: dossierId,
      p_payload: {
        sent_to: to,
        document_count: documents.length,
        dossier_number: dossier.dossier_number,
      },
    })
    if (auditErr) console.error("[email-dossier] audit log failed:", auditErr)

    revalidatePath(`/dossiers/${dossierId}`)
    return { sentTo: to }
  } catch (e) {
    console.error("[email-dossier]", e)
    return { error: sanitizeError(e) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// archiveDossier — admin only
// ─────────────────────────────────────────────────────────────────────────────
export async function archiveDossier(id: string): Promise<{ error: string | null }> {
  const { profile, supabase } = await requireAuth()
  if (profile?.role !== "admin") return { error: "Only admin can archive dossiers." }

  const { error } = await supabase
    .from("customer_dossiers")
    .update({ status: "archived" as DossierStatus })
    .eq("id", id)
    .neq("status", "submitted")

  if (error) return { error: sanitizeError(error) }

  revalidatePath(`/dossiers/${id}`)
  revalidatePath("/dossiers")
  return { error: null }
}
