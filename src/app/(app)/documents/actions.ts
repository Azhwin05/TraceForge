"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { validateFileSignature } from "@/lib/documents/file-signature"
import type { DocumentEntityType, DocumentType, UserRole } from "@/types/database"
import { sanitizeError } from "@/lib/security"

// Files up to this size are downloaded server-side to verify their magic bytes.
// Larger files are accepted on extension alone (already limited to 50 MB client-side).
const SIGNATURE_CHECK_MAX_BYTES = 10 * 1024 * 1024

// Role permission map — mirrors storage RLS but enforced at the action layer.
const DOCUMENT_UPLOAD_ROLES: Record<DocumentType, UserRole[]> = {
  wps_pdf:                ["admin", "qa", "engineer"],
  pqr_pdf:               ["admin", "qa", "engineer"],
  pmi_report:            ["admin", "qa"],
  dimension_report:      ["admin", "qa"],
  pwht_chart:            ["admin", "engineer", "qa"],
  dispatch_doc:          ["admin"],
  invoice:               ["admin", "accounts"],
  calibration_cert:      ["admin", "qa"],
  customer_po:           ["admin"],
  customer_drawing:      ["admin"],
  job_card_pdf:          ["admin"],
  overlay_welding_report: ["admin", "qa"],
  annotated_drawing:     ["admin", "qa"],
  other:                 ["admin", "qa", "engineer"],
  dossier_index:         ["admin"],
  dossier_zip:           ["admin"],
  welding_report:            ["admin", "engineer", "qa"],
  electrode_test_certificate: ["admin", "engineer", "qa"],
  consumable_certificate:    ["admin", "engineer", "qa"],
  material_test_certificate: ["admin", "qa"],
  nde_report:                ["admin", "qa"],
  lpt_report:                ["admin", "qa"],
  hardness_report:           ["admin", "qa"],
  incoming_delivery_challan: ["admin", "operator"],
  outgoing_delivery_challan: ["admin"],
  final_acceptance_document: ["admin", "qa"],
  contract_review:           ["admin"],
  process_layout:            ["admin", "engineer"],
  rework_photo:              ["admin", "operator", "engineer", "qa"],
  consolidated_report:       ["admin", "qa"],
}

// ─────────────────────────────────────────────────────────────────────────────
// registerUploadedDocument
// Called AFTER the client has already uploaded the file to Supabase Storage.
// Validates the role, handles versioning, inserts a documents row, and syncs
// storage_path back to the owning module table.
// ─────────────────────────────────────────────────────────────────────────────
export type RegisterDocumentInput = {
  entityType:    DocumentEntityType
  entityId:      string
  documentType:  DocumentType
  storagePath:   string
  fileName:      string
  fileSize?:     number | null
  mimeType?:     string | null
  documentName?: string | null
  jobCardId?:    string | null
  sourceModule?: string | null
}

export type RegisterDocumentResult =
  | { data: { id: string; version: number }; error: null }
  | { data: null; error: string }

export async function registerUploadedDocument(
  input: RegisterDocumentInput,
): Promise<RegisterDocumentResult> {
  const session = await requireAuth()
  const { user, profile, supabase } = session
  const role = (profile?.role ?? "operator") as UserRole

  // Enforce upload permission for this document type
  if (!DOCUMENT_UPLOAD_ROLES[input.documentType]?.includes(role)) {
    return { data: null, error: `Role '${role}' cannot upload '${input.documentType}' documents.` }
  }

  // Sanity-check path (the client must have already uploaded to this path)
  if (!input.storagePath || input.storagePath.split("/").length < 3) {
    return { data: null, error: "Invalid storage path." }
  }

  // Server-side content validation: the client-side MIME/extension check is
  // advisory only. Download the object and verify its magic bytes match the
  // claimed file type; delete the object if it doesn't.
  if ((input.fileSize ?? 0) <= SIGNATURE_CHECK_MAX_BYTES) {
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from("documents")
      .download(input.storagePath)

    if (downloadErr || !fileBlob) {
      return { data: null, error: "Uploaded file could not be verified. Please re-upload." }
    }

    const bytes = new Uint8Array(await fileBlob.slice(0, 4096).arrayBuffer())
    const signatureError = validateFileSignature(input.fileName, bytes)
    if (signatureError) {
      try {
        await supabase.storage.from("documents").remove([input.storagePath])
      } catch {}
      return { data: null, error: signatureError }
    }
  }

  // Find the current latest version so we can increment it
  const { data: existingLatest } = await supabase
    .from("documents")
    .select("id, version")
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("document_type", input.documentType)
    .eq("is_latest", true)
    .order("version", { ascending: false })
    .limit(1)

  const prevVersion =
    (existingLatest as Array<{ id: string; version: number }> | null)?.[0]?.version ?? 0

  // Demote all previous latest versions for this entity + document type
  if (prevVersion > 0) {
    await supabase
      .from("documents")
      .update({ is_latest: false })
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .eq("document_type", input.documentType)
      .eq("is_latest", true)
  }

  // Insert the new document record
  const { data: doc, error: dbError } = await supabase
    .from("documents")
    .insert({
      entity_type:       input.entityType,
      entity_id:         input.entityId,
      job_card_id:       input.jobCardId ?? null,
      document_type:     input.documentType,
      document_category: "uploaded",
      document_name:     input.documentName ?? input.fileName,
      storage_path:      input.storagePath,
      file_name:         input.fileName,
      file_size:         input.fileSize ?? null,
      mime_type:         input.mimeType ?? null,
      version:           prevVersion + 1,
      is_latest:         true,
      source_module:     input.sourceModule ?? null,
      uploaded_by:       user.id,
    })
    .select("id, version")
    .single()

  if (dbError) {
    // Attempt cleanup of the orphaned storage object
    try {
      await supabase.storage.from("documents").remove([input.storagePath])
    } catch {}
    return { data: null, error: `Database error: ${dbError.message}` }
  }

  // Sync storage_path back to the owning module table
  await syncStoragePath(supabase, input.entityType, input.entityId, input.storagePath)

  // Revalidate cache
  if (input.jobCardId) {
    revalidatePath(`/job-cards/${input.jobCardId}`)
  }
  revalidatePath("/pwht-runs")

  return { data: doc as { id: string; version: number }, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// getSignedDownloadUrl — generates a short-lived signed URL for a private file
// ─────────────────────────────────────────────────────────────────────────────
export async function getSignedDownloadUrl(
  storagePath: string,
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const { profile, supabase } = await requireAuth()

  // Defence in depth. Storage RLS (migration 0053) is the real boundary, but
  // requireAuth alone admits portal customers, and this action does not scope
  // by ownership the way the portal's own getCustomerSignedUrl does. Customers
  // must use that one.
  if (profile?.role === "customer") {
    return { url: null, error: "Not available for portal accounts." }
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600) // 1 hour

  if (error) {
    console.error("[documents] signing failed:", storagePath, error)
    return { url: null, error: sanitizeError(error) }
  }
  return { url: data.signedUrl, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// archiveDocument — soft-delete; only admin can archive
// ─────────────────────────────────────────────────────────────────────────────
export async function archiveDocument(
  documentId: string,
): Promise<{ error: string | null }> {
  const { profile, supabase } = await requireAuth()
  if (profile?.role !== "admin") return { error: "Only admin can archive documents." }

  const { error } = await supabase
    .from("documents")
    .update({ is_active: false, is_latest: false })
    .eq("id", documentId)

  if (error) return { error: sanitizeError(error) }
  return { error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// getJobCardDocuments — returns latest active documents for a job card
// ─────────────────────────────────────────────────────────────────────────────
export async function getJobCardDocuments(jobCardId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("job_card_id", jobCardId)
    .eq("is_active", true)
    .eq("is_latest", true)
    .order("uploaded_at", { ascending: false })

  if (error) {
    console.error("[documents] job card documents:", error)
    return { data: [], error: sanitizeError(error) }
  }
  return { data: data ?? [], error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: sync storage_path back to the owning module table row
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncStoragePath(supabase: any, entityType: DocumentEntityType, entityId: string, path: string) {
  switch (entityType) {
    case "wps_qualification":
      await supabase.from("wps_qualifications").update({ storage_path: path }).eq("id", entityId)
      break
    case "pmi_report":
      await supabase.from("pmi_reports").update({ storage_path: path }).eq("id", entityId)
      break
    case "dimension_report":
      await supabase.from("dimension_reports").update({ storage_path: path }).eq("id", entityId)
      break
    case "pwht_run":
      await supabase.from("pwht_runs").update({ storage_path: path }).eq("id", entityId)
      break
    case "dispatch":
      await supabase.from("dispatches").update({ storage_path: path }).eq("id", entityId)
      break
    case "instrument_master":
      await supabase.from("instrument_master").update({ calibration_storage_path: path }).eq("id", entityId)
      break
    // job_card, wps_master, nde_record, other → tracked in documents table only
  }
}
