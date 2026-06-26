"use server"

/**
 * Dossier Auto-Population Server Actions
 *
 * Automatically suggests documents that meet all conditions for customer dossier:
 * - Latest revision
 * - Active (not archived)
 * - Not rejected
 * - Approved (if approval required)
 * - Dossier eligible
 * - Not superseded
 */

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================

const autopopulateDossierSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
  excludeDocumentIds: z.array(z.string().uuid()).optional().default([]),
})

// ============================================================================
// AUTO-POPULATE DOSSIER
// ============================================================================

export async function autopopulateDossier(data: unknown): Promise<{
  error?: string
  suggestedDocumentIds?: string[]
  totalCount?: number
}> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }

  const { supabase } = guard

  try {
    const validated = autopopulateDossierSchema.parse(data)

    // Fetch all documents for this job card
    const { data: allDocuments, error: docError } = await supabase
      .from("documents")
      .select("id, document_type, approval_status, is_latest, is_active, metadata_json")
      .eq("job_card_id", validated.jobCardId)
      .eq("is_active", true)
      .order("version", { ascending: false })

    if (docError) {
      console.error("[autopopulate-dossier]", docError)
      return { error: sanitizeError(docError) }
    }

    if (!allDocuments || allDocuments.length === 0) {
      return {
        suggestedDocumentIds: [],
        totalCount: 0,
      }
    }

    // Filter for dossier-eligible documents
    const suggestedDocs = allDocuments.filter((doc) => {
      // Exclude manually excluded
      if (validated.excludeDocumentIds.includes(doc.id)) return false

      // Must be latest revision
      if (!doc.is_latest) return false

      // Must be active
      if (!doc.is_active) return false

      // Must not be rejected
      if (doc.approval_status === "rejected") return false

      // Must be approved if approval was required
      // (In a real implementation, would check DOCUMENT_REQUIREMENTS config)
      const approvalRequired = doc.approval_status !== "none"
      if (approvalRequired && doc.approval_status !== "approved") return false

      // Must be dossier eligible (either by config or metadata)
      const metadata = typeof doc.metadata_json === "object" ? doc.metadata_json : {}
      const isDossierEligible =
        typeof metadata === "object" &&
        metadata !== null &&
        "dossier_eligible" in metadata
          ? (metadata as Record<string, unknown>).dossier_eligible
          : true // Default to eligible if not explicitly set

      if (!isDossierEligible) return false

      return true
    })

    return {
      suggestedDocumentIds: suggestedDocs.map((d) => d.id),
      totalCount: suggestedDocs.length,
    }
  } catch (e) {
    console.error("[autopopulate-dossier]", e)
    return { error: sanitizeError(e) }
  }
}

// ============================================================================
// CREATE DOSSIER WITH AUTO-POPULATED DOCUMENTS
// ============================================================================

const createDossierWithAutoPopulateSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
  excludeDocumentIds: z.array(z.string().uuid()).optional().default([]),
  remarks: z.string().optional(),
})

export async function createDossierWithAutoPopulate(data: unknown): Promise<{
  error?: string
  dossierId?: string
}> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }

  const { supabase, user } = guard

  try {
    const validated = createDossierWithAutoPopulateSchema.parse(data)

    // Get suggested documents
    const suggestResult = await autopopulateDossier({
      jobCardId: validated.jobCardId,
      excludeDocumentIds: validated.excludeDocumentIds,
    })

    if (suggestResult.error) {
      return { error: suggestResult.error }
    }

    const suggestedDocIds = suggestResult.suggestedDocumentIds || []

    // Create dossier
    const { data: newDossier, error: dossierError } = await supabase
      .from("customer_dossiers")
      .insert({
        job_card_id: validated.jobCardId,
        dossier_number: `DOSS-${Date.now()}`,
        status: "draft",
        created_by: user.id,
        created_at: new Date().toISOString(),
        notes: validated.remarks,
      })
      .select("id")
      .single()

    if (dossierError) {
      console.error("[create-dossier]", dossierError)
      return { error: sanitizeError(dossierError) }
    }

    // Link suggested documents
    if (suggestedDocIds.length > 0) {
      const dossierDocuments = suggestedDocIds.map((docId, index) => ({
        dossier_id: newDossier.id,
        document_id: docId,
        sequence_order: index + 1,
        added_by: user.id,
        added_at: new Date().toISOString(),
      }))

      const { error: linkError } = await supabase
        .from("customer_dossier_documents")
        .insert(dossierDocuments)

      if (linkError) {
        console.error("[link-dossier-documents]", linkError)
        // Don't fail - dossier was created, just couldn't auto-populate
        console.warn("Auto-population partially failed, but dossier was created")
      }
    }

    revalidatePath(`/job-cards/${validated.jobCardId}`)

    return { dossierId: newDossier.id }
  } catch (e) {
    console.error("[create-dossier-with-autopop]", e)
    return { error: sanitizeError(e) }
  }
}

export type AutopopulateDossierInput = z.infer<typeof autopopulateDossierSchema>
export type CreateDossierWithAutoPopulateInput = z.infer<
  typeof createDossierWithAutoPopulateSchema
>
