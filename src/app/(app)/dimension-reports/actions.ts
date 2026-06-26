"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { dimensionReportSchema, type DimensionReportInput } from "@/lib/validations/dimension-report"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

function buildRow(data: DimensionReportInput) {
  return {
    report_number:        sanitize(data.report_number),
    report_date:          data.report_date || null,
    vendor_name:          sanitize(data.vendor_name),
    description:          sanitize(data.description),
    drawing_number:       sanitize(data.drawing_number),
    drawing_revision:     sanitize(data.drawing_revision),
    po_number:            sanitize(data.po_number),
    material_code:        sanitize(data.material_code),
    sample_number:        sanitize(data.sample_number),
    heat_number:          sanitize(data.heat_number),
    mp_dp_number:         sanitize(data.mp_dp_number),
    instrument_master_id: data.instrument_master_id || null,
    instrument_used:      sanitize(data.instrument_used),
    gauge_used:           sanitize(data.gauge_used),
    visual_satisfactory:  data.visual_satisfactory ?? true,
    inspected_by:         sanitize(data.inspected_by),
    approved_by:          sanitize(data.approved_by),
    result_status:        data.result_status,
    dimensions:           data.dimensions as unknown as Record<string, unknown>[],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createDimensionReport
// ─────────────────────────────────────────────────────────────────────────────
export async function createDimensionReport(
  jobCardId: string,
  raw: DimensionReportInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = dimensionReportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data: row, error } = await supabase
    .from("dimension_reports")
    .insert({
      job_card_id:       jobCardId,
      created_by:        user.id,
      dimension_status:  "draft",
      // Legacy JSONB columns — keep empty objects as defaults
      required_dimensions: {},
      tolerances:          {},
      sample_readings:     {},
      ...buildRow(parsed.data),
    })
    .select("id")
    .single()

  if (error) { console.error("[dimension-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/dimension-reports")
  return { id: (row as { id: string }).id }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDimensionReport
// ─────────────────────────────────────────────────────────────────────────────
export async function updateDimensionReport(
  id: string,
  raw: DimensionReportInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, profile } = guard

  const parsed = dimensionReportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  // QA may only edit draft reports
  if (profile?.role === "qa") {
    const { data: existing } = await supabase
      .from("dimension_reports")
      .select("dimension_status")
      .eq("id", id)
      .single()
    if (!existing || (existing as { dimension_status: string }).dimension_status !== "draft") {
      return { error: "QA can only edit draft dimension reports." }
    }
  }

  const { data: cur } = await supabase
    .from("dimension_reports")
    .select("job_card_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("dimension_reports")
    .update(buildRow(parsed.data))
    .eq("id", id)

  if (error) { console.error("[dimension-reports]", error); return { error: sanitizeError(error) } }

  const jobCardId = (cur as { job_card_id: string } | null)?.job_card_id
  if (jobCardId) revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/dimension-reports")
  revalidatePath(`/dimension-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// approveDimensionReport — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function approveDimensionReport(
  id: string,
  approvedByName: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("dimension_reports")
    .select("dimension_status")
    .eq("id", id)
    .single()
  if (!existing || (existing as { dimension_status: string }).dimension_status !== "draft") {
    return { error: "Only draft reports can be approved." }
  }

  const { error } = await supabase
    .from("dimension_reports")
    .update({
      dimension_status: "approved",
      approved_by:      approvedByName || null,
      approved_at:      new Date().toISOString(),
    })
    .eq("id", id)

  if (error) { console.error("[dimension-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath("/dimension-reports")
  revalidatePath(`/dimension-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectDimensionReport — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectDimensionReport(
  id: string,
  reason: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("dimension_reports")
    .select("dimension_status")
    .eq("id", id)
    .single()
  if (!existing) return { error: "Report not found." }
  const st = (existing as { dimension_status: string }).dimension_status
  if (st === "submitted") return { error: "Submitted reports cannot be rejected." }

  const { error } = await supabase
    .from("dimension_reports")
    .update({ dimension_status: "rejected", rejection_reason: reason || null })
    .eq("id", id)

  if (error) { console.error("[dimension-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath("/dimension-reports")
  revalidatePath(`/dimension-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// markSubmittedToCustomer — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function markSubmittedToCustomer(
  id: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("dimension_reports")
    .select("dimension_status")
    .eq("id", id)
    .single()
  if (!existing || (existing as { dimension_status: string }).dimension_status !== "approved") {
    return { error: "Only approved reports can be marked as submitted." }
  }

  const { error } = await supabase
    .from("dimension_reports")
    .update({
      dimension_status:      "submitted",
      submitted_to_customer: true,
      submitted_at:          new Date().toISOString(),
    })
    .eq("id", id)

  if (error) { console.error("[dimension-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath("/dimension-reports")
  revalidatePath(`/dimension-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// saveDimensionPdfPath — called by API route after PDF generated
// ─────────────────────────────────────────────────────────────────────────────
export async function saveDimensionPdfPath(
  id: string,
  storagePath: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("dimension_reports")
    .update({ generated_pdf_path: storagePath })
    .eq("id", id)

  if (error) { console.error("[dimension-reports]", error); return { error: sanitizeError(error) } }

  revalidatePath(`/dimension-reports/${id}`)
  return {}
}
