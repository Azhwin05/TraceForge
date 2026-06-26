"use server"

/**
 * Job Card Document Management Server Actions
 *
 * Handles:
 * - Document upload and linking to job cards
 * - Document approval workflow
 * - Document versioning
 * - Dossier eligibility marking
 */

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { z } from "zod"

// Document types allowed by the database constraint
const DOCUMENT_TYPES = [
  'wps_pdf', 'pqr_pdf', 'pmi_report', 'dimension_report', 'pwht_chart',
  'dispatch_doc', 'invoice', 'calibration_cert', 'customer_po', 'customer_drawing',
  'job_card_pdf', 'overlay_welding_report', 'annotated_drawing', 'other',
  'dossier_index', 'dossier_zip', 'welding_report', 'electrode_test_certificate',
  'consumable_certificate', 'material_test_certificate', 'nde_report', 'lpt_report',
  'hardness_report', 'incoming_delivery_challan', 'outgoing_delivery_challan',
  'final_acceptance_document', 'contract_review', 'process_layout'
] as const

// ============================================================================
// SCHEMAS
// ============================================================================

const uploadDocumentSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
  documentType: z.enum(DOCUMENT_TYPES as readonly [string, ...string[]], {
    errorMap: () => ({ message: "Invalid document type" })
  }),
  fileName: z.string().min(1, "Filename required"),
  filePath: z.string().min(1, "File path required"),
  fileSize: z.number().int().min(1, "File size required"),
  mimeType: z.string().min(1, "MIME type required"),
  sourceModule: z.string().optional(),
  sourceRecordId: z.string().uuid().optional(),
  approvalRequired: z.boolean().default(false),
  dossierEligible: z.boolean().default(false),
})

const approveDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
})

const rejectDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  rejectionReason: z.string().min(1, "Rejection reason required").max(500),
})

const markDocumentDossierEligibleSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  eligible: z.boolean(),
})

// ============================================================================
// DOCUMENT UPLOAD
// ============================================================================

export async function uploadJobCardDocument(data: unknown): Promise<
  { error?: string; documentId?: string; version?: number } | { error: string }
> {
  const guard = await requireRole(["admin", "operator", "engineer", "qa", "accounts"])
  if (guard.error) return { error: guard.error }

  const { supabase, user } = guard

  try {
    const validated = uploadDocumentSchema.parse(data)

    // Verify job card exists and user has access
    const { data: jobCard, error: jcError } = await supabase
      .from("job_cards")
      .select("id, jc_number")
      .eq("id", validated.jobCardId)
      .single()

    if (jcError || !jobCard) {
      return { error: "Job card not found" }
    }

    // Check if a document with this type already exists (for versioning)
    const { data: existingDocs, error: docError } = await supabase
      .from("documents")
      .select("id, version, is_latest")
      .eq("job_card_id", validated.jobCardId)
      .eq("document_type", validated.documentType)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)

    if (docError && docError.code !== "PGRST116") {
      console.error("[document-upload]", docError)
      return { error: sanitizeError(docError) }
    }

    // Calculate next version
    const lastVersion = existingDocs && existingDocs.length > 0 ? existingDocs[0].version : 0
    const nextVersion = (lastVersion || 0) + 1

    // Mark old version as not latest
    if (existingDocs && existingDocs.length > 0) {
      await supabase
        .from("documents")
        .update({ is_latest: false })
        .eq("id", existingDocs[0].id)
    }

    // Insert new document record
    const { data: newDoc, error: insertError } = await supabase
      .from("documents")
      .insert({
        job_card_id: validated.jobCardId,
        document_type: validated.documentType,
        storage_path: validated.filePath,
        file_name: validated.fileName,
        file_size: validated.fileSize,
        mime_type: validated.mimeType,
        version: nextVersion,
        is_latest: true,
        is_active: true,
        document_category: "uploaded",
        source_module: validated.sourceModule,
        approval_status: validated.approvalRequired ? "pending" : "none",
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[document-upload] insert failed", insertError)
      return { error: sanitizeError(insertError) }
    }

    // Revalidate job card page to update document tracker
    revalidatePath(`/job-cards/${validated.jobCardId}`)

    return {
      documentId: newDoc.id,
      version: nextVersion,
    }
  } catch (e) {
    console.error("[document-upload]", e)
    return { error: sanitizeError(e) }
  }
}

// ============================================================================
// DOCUMENT APPROVAL
// ============================================================================

export async function approveDocument(data: unknown): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }

  const { supabase } = guard

  try {
    const validated = approveDocumentSchema.parse(data)

    // Get document and verify it exists
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id, job_card_id, approval_status")
      .eq("id", validated.documentId)
      .single()

    if (fetchError || !doc) {
      return { error: "Document not found" }
    }

    // Check idempotency: already approved
    if (doc.approval_status === "approved") {
      return {} // Success: no change needed
    }

    // Update approval
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        approval_status: "approved",
      })
      .eq("id", validated.documentId)

    if (updateError) {
      console.error("[approve-document]", updateError)
      return { error: sanitizeError(updateError) }
    }

    // Audit log
    revalidatePath(`/job-cards/${doc.job_card_id}`)

    return {}
  } catch (e) {
    console.error("[approve-document]", e)
    return { error: sanitizeError(e) }
  }
}

// ============================================================================
// DOCUMENT REJECTION
// ============================================================================

export async function rejectDocument(data: unknown): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }

  const { supabase } = guard

  try {
    const validated = rejectDocumentSchema.parse(data)

    // Get document
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id, job_card_id, approval_status, is_latest")
      .eq("id", validated.documentId)
      .single()

    if (fetchError || !doc) {
      return { error: "Document not found" }
    }

    // Check idempotency: already rejected
    if (doc.approval_status === "rejected") {
      return {} // Success: no change needed
    }

    // Check: cannot reject if already submitted to customer
    const { data: dossierDocs } = await supabase
      .from("customer_dossier_documents")
      .select("id")
      .eq("document_id", validated.documentId)
      .limit(1)

    if (dossierDocs && dossierDocs.length > 0) {
      return {
        error: "Cannot reject document that has been submitted to customer in dossier",
      }
    }

    // Reject the document
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        approval_status: "rejected",
      })
      .eq("id", validated.documentId)

    if (updateError) {
      console.error("[reject-document]", updateError)
      return { error: sanitizeError(updateError) }
    }

    revalidatePath(`/job-cards/${doc.job_card_id}`)

    return {}
  } catch (e) {
    console.error("[reject-document]", e)
    return { error: sanitizeError(e) }
  }
}

// ============================================================================
// MARK DOSSIER ELIGIBLE
// ============================================================================

export async function markDocumentDossierEligible(data: unknown): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }

  const { supabase } = guard

  try {
    const validated = markDocumentDossierEligibleSchema.parse(data)

    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("job_card_id")
      .eq("id", validated.documentId)
      .single()

    if (fetchError || !doc) {
      return { error: "Document not found" }
    }

    // Update metadata to mark dossier eligible
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        metadata_json: {
          dossier_eligible: validated.eligible,
        },
      })
      .eq("id", validated.documentId)

    if (updateError) {
      console.error("[mark-dossier-eligible]", updateError)
      return { error: sanitizeError(updateError) }
    }

    revalidatePath(`/job-cards/${doc.job_card_id}`)

    return {}
  } catch (e) {
    console.error("[mark-dossier-eligible]", e)
    return { error: sanitizeError(e) }
  }
}

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>
export type ApproveDocumentInput = z.infer<typeof approveDocumentSchema>
export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>
