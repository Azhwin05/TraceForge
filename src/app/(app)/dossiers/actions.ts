"use server"

import { revalidatePath } from "next/cache"
import { requireAuth, requireRole } from "@/lib/auth"
import { dossierSchema } from "@/lib/validations/dossier"
import type { DossierStatus, Document as DocRecord, DocumentType } from "@/types/database"

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

  if (error) return { error: error.message }

  revalidatePath(`/dossiers/${id}`)
  revalidatePath("/dossiers")
  return { error: null }
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

  if (error) return { error: error.message }

  revalidatePath(`/dossiers/${id}`)
  revalidatePath("/dossiers")
  return { error: null }
}
