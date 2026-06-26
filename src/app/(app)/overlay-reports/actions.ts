"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { overlayReportSchema, type OverlayReportInput } from "@/lib/validations/overlay-report"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

function buildRow(data: OverlayReportInput) {
  return {
    // Header
    report_number:           sanitize(data.report_number),
    report_date:             data.report_date || null,
    vendor_name:             sanitize(data.vendor_name),
    vendor_number:           sanitize(data.vendor_number),
    customer_name:           sanitize(data.customer_name),
    po_number:               sanitize(data.po_number),
    nbdn_number:             sanitize(data.nbdn_number),
    material_code:           sanitize(data.material_code),
    drawing_number:          sanitize(data.drawing_number),
    wps_number:              sanitize(data.wps_number),
    item_description:        sanitize(data.item_description),
    quantity:                sanitize(data.quantity),
    base_material_grade:     sanitize(data.base_material_grade),
    heat_number:             sanitize(data.heat_number),
    test_coupon_number:      sanitize(data.test_coupon_number),
    dimension_report_number: sanitize(data.dimension_report_number),
    // Welding
    welder_name:                 sanitize(data.welder_name),
    visual_examination:          sanitize(data.visual_examination),
    process:                     sanitize(data.process),
    job_card_number:             sanitize(data.job_card_number),
    job_card_date:               data.job_card_date || null,
    deposit_material:            sanitize(data.deposit_material),
    aws_class_number:            sanitize(data.aws_class_number),
    consumable_make:             sanitize(data.consumable_make),
    consumable_batch_number:     sanitize(data.consumable_batch_number),
    date_of_welding:             data.date_of_welding || null,
    heat_treatment_chart_number: sanitize(data.heat_treatment_chart_number),
    hardness_required:           sanitize(data.hardness_required),
    hardness_actual:             sanitize(data.hardness_actual),
    deposit_thickness_condition: sanitize(data.deposit_thickness_condition),
    deposit_thickness_required:  sanitize(data.deposit_thickness_required),
    deposit_thickness_actual:    sanitize(data.deposit_thickness_actual),
    // LPT/NDE
    lpt_procedure_ref:    sanitize(data.lpt_procedure_ref),
    type_of_penetrant:    sanitize(data.type_of_penetrant),
    stage_of_test:        sanitize(data.stage_of_test),
    penetrant_application: sanitize(data.penetrant_application),
    penetrant_removal:    sanitize(data.penetrant_removal),
    evaluation_of_dp_test: sanitize(data.evaluation_of_dp_test),
    temperature_of_part:  sanitize(data.temperature_of_part),
    penetrant_dwell_time: sanitize(data.penetrant_dwell_time),
    surface_condition:    sanitize(data.surface_condition),
    developer_application: sanitize(data.developer_application),
    post_cleaning:        sanitize(data.post_cleaning),
    developer_dwell_time: sanitize(data.developer_dwell_time),
    chemicals_used_json:  (data.chemicals_used ?? []) as unknown as Record<string, unknown>[],
    result_status:        data.result_status ?? null,
    // Sign-off
    remarks:      sanitize(data.remarks),
    inspected_by: sanitize(data.inspected_by),
    approved_by:  sanitize(data.approved_by),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createOverlayReport
// ─────────────────────────────────────────────────────────────────────────────
export async function createOverlayReport(
  jobCardId: string,
  raw: OverlayReportInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = overlayReportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data: row, error } = await supabase
    .from("overlay_welding_reports")
    .insert({
      job_card_id:   jobCardId,
      created_by:    user.id,
      report_status: "draft",
      ...buildRow(parsed.data),
    })
    .select("id")
    .single()

  if (error) { console.error("[overlay-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/overlay-reports")
  return { id: (row as { id: string }).id }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateOverlayReport
// ─────────────────────────────────────────────────────────────────────────────
export async function updateOverlayReport(
  id: string,
  raw: OverlayReportInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, profile } = guard

  const parsed = overlayReportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  if (profile?.role === "qa") {
    const { data: existing } = await supabase
      .from("overlay_welding_reports")
      .select("report_status")
      .eq("id", id)
      .single()
    if (!existing || (existing as { report_status: string }).report_status !== "draft") {
      return { error: "QA can only edit draft overlay reports." }
    }
  }

  const { data: cur } = await supabase
    .from("overlay_welding_reports")
    .select("job_card_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("overlay_welding_reports")
    .update(buildRow(parsed.data))
    .eq("id", id)

  if (error) { console.error("[overlay-reports]", error); return { error: sanitizeError(error) } }

  const jobCardId = (cur as { job_card_id: string } | null)?.job_card_id
  if (jobCardId) revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/overlay-reports")
  revalidatePath(`/overlay-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// approveOverlayReport
// ─────────────────────────────────────────────────────────────────────────────
export async function approveOverlayReport(
  id: string,
  approvedByName: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("overlay_welding_reports")
    .select("report_status")
    .eq("id", id)
    .single()
  if (!existing || (existing as { report_status: string }).report_status !== "draft") {
    return { error: "Only draft reports can be approved." }
  }

  const { error } = await supabase
    .from("overlay_welding_reports")
    .update({
      report_status: "approved",
      approved_by:   approvedByName || null,
      approved_at:   new Date().toISOString(),
    })
    .eq("id", id)

  if (error) { console.error("[overlay-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath("/overlay-reports")
  revalidatePath(`/overlay-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectOverlayReport
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectOverlayReport(
  id: string,
  reason: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("overlay_welding_reports")
    .select("report_status")
    .eq("id", id)
    .single()
  if (!existing) return { error: "Report not found." }
  const st = (existing as { report_status: string }).report_status
  if (st === "submitted") return { error: "Submitted reports cannot be rejected." }

  const { error } = await supabase
    .from("overlay_welding_reports")
    .update({ report_status: "rejected", rejection_reason: reason || null })
    .eq("id", id)

  if (error) { console.error("[overlay-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath("/overlay-reports")
  revalidatePath(`/overlay-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// markOverlaySubmitted
// ─────────────────────────────────────────────────────────────────────────────
export async function markOverlaySubmitted(
  id: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("overlay_welding_reports")
    .select("report_status")
    .eq("id", id)
    .single()
  if (!existing || (existing as { report_status: string }).report_status !== "approved") {
    return { error: "Only approved reports can be marked as submitted." }
  }

  const { error } = await supabase
    .from("overlay_welding_reports")
    .update({
      report_status:         "submitted",
      submitted_to_customer: true,
      submitted_at:          new Date().toISOString(),
    })
    .eq("id", id)

  if (error) { console.error("[overlay-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath("/overlay-reports")
  revalidatePath(`/overlay-reports/${id}`)
  return {}
}
