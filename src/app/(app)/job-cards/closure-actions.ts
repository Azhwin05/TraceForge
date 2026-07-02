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

    // The nested-relation select isn't covered by the generated types
    type JobCardWithRelations = {
      id: string
      status: string
      process_type: string[]
      documents: Array<Record<string, unknown>> | null
      pmi_reports: Array<Record<string, unknown>> | null
      dimension_reports: Array<Record<string, unknown>> | null
      overlay_welding_reports: Array<Record<string, unknown>> | null
      pwht_runs: Array<Record<string, unknown>> | null
      dispatches: Array<Record<string, unknown>> | null
      accounts: Array<Record<string, unknown>> | null
    }
    const jc = jobCard as unknown as JobCardWithRelations

    // 2. Check WPS approval
    const wpsDoc = jc.documents?.find((d: Record<string, unknown>) => d.document_type === "wps_pdf")
    if (!wpsDoc || wpsDoc.approval_status !== "approved") {
      blockers.push("WPS must be uploaded and approved")
    }

    // 3. Check PWHT if required
    if (jc.process_type.includes("welding")) {
      const pwhtRecord = jc.pwht_runs?.[0] as Record<string, unknown> | undefined
      if (!pwhtRecord) {
        blockers.push("Heat Treatment Chart required but not found")
      } else if (pwhtRecord.approval_status !== "approved") {
        blockers.push("Heat Treatment Chart must be approved by QA")
      }
    }

    // 4. Check inspection reports
    if (jc.process_type.includes("welding")) {
      const hasInspection =
        (jc.dimension_reports?.length ?? 0) > 0 ||
        (jc.pmi_reports?.length ?? 0) > 0 ||
        (jc.overlay_welding_reports?.length ?? 0) > 0

      if (!hasInspection) {
        blockers.push("At least one inspection report (Dimension, PMI, or Overlay) is required")
      }

      // Check approvals
      const dimensionApproved = jc.dimension_reports?.some(
        (r: Record<string, unknown>) => r.dimension_status === "approved"
      )
      const pmiApproved = jc.pmi_reports?.some((r: Record<string, unknown>) => r.pmi_status === "approved")
      const overlayApproved = jc.overlay_welding_reports?.some(
        (r: Record<string, unknown>) => r.report_status === "approved"
      )

      if (!dimensionApproved && !pmiApproved && !overlayApproved) {
        blockers.push("At least one inspection report must be approved")
      }
    }

    // 5. Check delivery challan
    const deliveryChalan = jc.documents?.find(
      (d: Record<string, unknown>) => d.document_type === "outgoing_delivery_challan"
    )
    if (!deliveryChalan) {
      blockers.push("Outgoing Delivery Challan is required")
    }

    // 6. Check invoice
    const invoice = jc.documents?.find((d: Record<string, unknown>) => d.document_type === "invoice")
    const accountsRecord = jc.accounts?.[0] as Record<string, unknown> | undefined

    if (!invoice) {
      warnings.push("No invoice uploaded (may be processed separately)")
    }

    if (accountsRecord?.payment_status !== "received") {
      blockers.push("Payment must be received before closure")
    }

    // 7. Check dossier
    const hasDossier = jc.documents?.some((d: Record<string, unknown>) => d.document_type === "dossier_zip")
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

    // Document gates are NEVER overridable — force close may only waive the
    // payment gate. The DB trigger re-enforces the same rules as a backstop.
    const { data: blockers } = await supabase
      .rpc("job_card_gate_blockers", { p_job_card_id: validated.jobCardId, p_new_status: "closed" })
    if (Array.isArray(blockers) && blockers.length > 0) {
      return { error: `Cannot force close — document requirements are not met: ${blockers.join("; ")}` }
    }

    // Record the override BEFORE the status change so the audit trail shows
    // intent even if the transition itself is rejected by the trigger.
    const { error: auditError } = await supabase.rpc("log_admin_action", {
      p_entity_type: "job_card",
      p_entity_id: validated.jobCardId,
      p_action: "force_close",
      p_payload: {
        override_reason: validated.overrideReason,
        closed_by: user.id,
      },
    })
    if (auditError) {
      console.error("[force-close-job] audit failed", auditError)
      return { error: "Could not record the override in the audit trail; job was not closed." }
    }

    // Update job status (trigger validates the transition path + gates)
    const { error: updateError } = await supabase
      .from("job_cards")
      .update({ status: "closed" })
      .eq("id", validated.jobCardId)

    if (updateError) {
      console.error("[force-close-job]", updateError)
      return { error: sanitizeError(updateError) }
    }

    revalidatePath(`/job-cards/${validated.jobCardId}`)
    revalidatePath("/job-cards")
    revalidatePath("/dashboard")

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
