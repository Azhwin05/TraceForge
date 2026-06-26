"use server"

/**
 * Job Closure Validation & Automation Server Actions
 *
 * Handles:
 * - Job closure validation (check all requirements)
 * - Closure blocking when requirements not met
 * - Admin override with audit trail
 * - Auto-closure on payment received
 */

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================

const validateClosureSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
})

const forceCloseJobSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
  overrideReason: z.string().min(10, "Override reason must be at least 10 characters"),
})

// ============================================================================
// CLOSURE VALIDATION
// ============================================================================

export async function validateJobClosure(data: unknown): Promise<{
  canClose: boolean
  blockers: string[]
  warnings: string[]
}> {
  const guard = await requireRole(["admin", "qa", "accounts"])
  if (guard.error) return { canClose: false, blockers: [guard.error], warnings: [] }

  const { supabase } = guard

  try {
    const validated = validateClosureSchema.parse(data)

    const blockers: string[] = []
    const warnings: string[] = []

    // 1. Fetch job card
    const { data: jobCard, error: jcError } = await supabase
      .from("job_cards")
      .select(
        `
        id, status, process_type,
        documents(*),
        pmi_reports(*),
        dimension_reports(*),
        overlay_welding_reports(*),
        pwht_runs(*),
        dispatches(*),
        accounts(*)
      `
      )
      .eq("id", validated.jobCardId)
      .single()

    if (jcError || !jobCard) {
      return { canClose: false, blockers: ["Job card not found"], warnings: [] }
    }

    // 2. Check WPS approval
    const wpsDoc = jobCard.documents?.find((d: Record<string, unknown>) => d.document_type === "wps_pdf")
    if (!wpsDoc || wpsDoc.approval_status !== "approved") {
      blockers.push("WPS must be uploaded and approved")
    }

    // 3. Check PWHT if required
    if (jobCard.process_type.includes("welding")) {
      const pwhtRecord = jobCard.pwht_runs?.[0] as Record<string, unknown> | undefined
      if (!pwhtRecord) {
        blockers.push("Heat Treatment Chart required but not found")
      } else if (pwhtRecord.approval_status !== "approved") {
        blockers.push("Heat Treatment Chart must be approved by QA")
      }
    }

    // 4. Check inspection reports
    if (jobCard.process_type.includes("welding")) {
      const hasInspection =
        jobCard.dimension_reports?.length > 0 ||
        jobCard.pmi_reports?.length > 0 ||
        jobCard.overlay_welding_reports?.length > 0

      if (!hasInspection) {
        blockers.push("At least one inspection report (Dimension, PMI, or Overlay) is required")
      }

      // Check approvals
      const dimensionApproved = jobCard.dimension_reports?.some(
        (r: Record<string, unknown>) => r.dimension_status === "approved"
      )
      const pmiApproved = jobCard.pmi_reports?.some((r: Record<string, unknown>) => r.pmi_status === "approved")
      const overlayApproved = jobCard.overlay_welding_reports?.some(
        (r: Record<string, unknown>) => r.report_status === "approved"
      )

      if (!dimensionApproved && !pmiApproved && !overlayApproved) {
        blockers.push("At least one inspection report must be approved")
      }
    }

    // 5. Check delivery challan
    const deliveryChalan = jobCard.documents?.find(
      (d: any) => d.document_type === "outgoing_delivery_challan"
    )
    if (!deliveryChalan) {
      blockers.push("Outgoing Delivery Challan is required")
    }

    // 6. Check invoice
    const invoice = jobCard.documents?.find((d: any) => d.document_type === "invoice")
    const accountsRecord = jobCard.accounts?.[0]

    if (!invoice) {
      warnings.push("No invoice uploaded (may be processed separately)")
    }

    if (accountsRecord?.payment_status !== "received") {
      blockers.push("Payment must be received before closure")
    }

    // 7. Check dossier
    const hasDossier = jobCard.documents?.some((d: any) => d.document_type === "dossier_zip")
    if (!hasDossier) {
      warnings.push("Customer dossier should be generated before closure")
    }

    return {
      canClose: blockers.length === 0,
      blockers,
      warnings,
    }
  } catch (e) {
    console.error("[validate-closure]", e)
    return {
      canClose: false,
      blockers: [sanitizeError(e)],
      warnings: [],
    }
  }
}

// ============================================================================
// FORCE CLOSE JOB (ADMIN OVERRIDE)
// ============================================================================

export async function forceCloseJob(data: unknown): Promise<{
  error?: string
  success?: boolean
}> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }

  const { supabase, user } = guard

  try {
    const validated = forceCloseJobSchema.parse(data)

    // Update job status
    const { error: updateError } = await supabase
      .from("job_cards")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.jobCardId)

    if (updateError) {
      console.error("[force-close-job]", updateError)
      return { error: sanitizeError(updateError) }
    }

    // Log admin override in audit
    await supabase.from("audit_log").insert({
      entity_type: "job_card",
      entity_id: validated.jobCardId,
      action: "force_close",
      new_value: {
        override_reason: validated.overrideReason,
        closed_by: user.id,
      },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    })

    revalidatePath(`/job-cards/${validated.jobCardId}`)

    return { success: true }
  } catch (e) {
    console.error("[force-close-job]", e)
    return { error: sanitizeError(e) }
  }
}

// ============================================================================
// AUTO-CLOSE ON PAYMENT (Triggered by database trigger)
// ============================================================================

/**
 * This is triggered by a database trigger when payment_status = 'received'
 * See migration 0016 for trigger definition
 *
 * The trigger calls:
 * close_job_on_payment_received() SECURITY DEFINER function
 *
 * No server action needed - handled at database level
 */

export type ValidateClosureInput = z.infer<typeof validateClosureSchema>
export type ForceCloseJobInput = z.infer<typeof forceCloseJobSchema>
