"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { pmiReportSchema, type PmiReportInput } from "@/lib/validations/pmi-report"
import type { PmiReadings } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

// Convert form locations (strings) → DB PmiReadings (numbers/null)
function buildReadings(input: PmiReportInput): PmiReadings {
  return input.locations.map((loc) => ({
    location_name: loc.location_name,
    heat_no:       sanitize(loc.heat_no),
    items: loc.items.map((item) => ({
      reading_no: parseInt(item.reading_no, 10) || 1,
      ni:  item.ni  ? parseFloat(item.ni)  : null,
      cr:  item.cr  ? parseFloat(item.cr)  : null,
      mo:  item.mo  ? parseFloat(item.mo)  : null,
      fe:  item.fe  ? parseFloat(item.fe)  : null,
      nb:  item.nb  ? parseFloat(item.nb)  : null,
      ti:  item.ti  ? parseFloat(item.ti)  : null,
    })),
  })) satisfies PmiReadings
}

function buildRow(data: PmiReportInput) {
  return {
    report_number:         sanitize(data.report_number),
    report_date:           data.report_date || null,
    customer:              sanitize(data.customer),
    quantity:              sanitize(data.quantity),
    order_number:          sanitize(data.order_number),
    item_no:               sanitize(data.item_no),
    valve_size_class:      sanitize(data.valve_size_class),
    valve_type_component:  sanitize(data.valve_type_component),
    base_material:         sanitize(data.base_material),
    overlay_material:      sanitize(data.overlay_material),
    drawing_number:        sanitize(data.drawing_number),
    procedure_ref:         sanitize(data.procedure_ref),
    heat_no:               sanitize(data.heat_no),
    instrument_name:       sanitize(data.instrument_name) ?? "",
    instrument_serial:     sanitize(data.instrument_serial) ?? "",
    calibration_due:       data.calibration_due || new Date().toISOString().split("T")[0],
    instrument_master_id:  data.instrument_master_id || null,
    inspected_by:          sanitize(data.inspected_by),
    result:                data.result,
    readings:              buildReadings(data) as unknown as Record<string, unknown>,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createPmiReport
// ─────────────────────────────────────────────────────────────────────────────
export async function createPmiReport(
  jobCardId: string,
  raw: PmiReportInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = pmiReportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data: row, error } = await supabase
    .from("pmi_reports")
    .insert({
      job_card_id: jobCardId,
      uploaded_by: user.id,
      pmi_status:  "draft",
      ...buildRow(parsed.data),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/pmi-reports")
  return { id: (row as { id: string }).id }
}

// ─────────────────────────────────────────────────────────────────────────────
// updatePmiReport
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePmiReport(
  id: string,
  raw: PmiReportInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, profile } = guard

  const parsed = pmiReportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  // QA may only edit their own drafts
  if (profile?.role === "qa") {
    const { data: existing } = await supabase
      .from("pmi_reports")
      .select("pmi_status")
      .eq("id", id)
      .single()
    if (!existing || (existing as { pmi_status: string }).pmi_status !== "draft") {
      return { error: "QA can only edit draft PMI reports." }
    }
  }

  const { error } = await supabase
    .from("pmi_reports")
    .update(buildRow(parsed.data))
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/pmi-reports")
  revalidatePath(`/pmi-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// approvePmiReport — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function approvePmiReport(
  id: string,
  approvedByName: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("pmi_reports")
    .select("pmi_status")
    .eq("id", id)
    .single()
  if (!existing || (existing as { pmi_status: string }).pmi_status !== "draft") {
    return { error: "Only draft reports can be approved." }
  }

  const { error } = await supabase
    .from("pmi_reports")
    .update({
      pmi_status:      "approved",
      approved_by_name: approvedByName || null,
      approved_at:     new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/pmi-reports")
  revalidatePath(`/pmi-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectPmiReport — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectPmiReport(
  id: string,
  reason: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("pmi_reports")
    .update({ pmi_status: "rejected", rejection_reason: reason || null })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/pmi-reports")
  revalidatePath(`/pmi-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// markSubmittedToCustomer — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function markSubmittedToCustomer(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submittedBy: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("pmi_reports")
    .select("pmi_status")
    .eq("id", id)
    .single()
  if (!existing || (existing as { pmi_status: string }).pmi_status !== "approved") {
    return { error: "Only approved reports can be marked as submitted." }
  }

  const { error } = await supabase
    .from("pmi_reports")
    .update({
      pmi_status:           "submitted",
      submitted_to_customer: true,
      submitted_at:         new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/pmi-reports")
  revalidatePath(`/pmi-reports/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// savePdfPath — called by the API route after PDF is generated and uploaded
// ─────────────────────────────────────────────────────────────────────────────
export async function savePdfPath(
  id: string,
  storagePath: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("pmi_reports")
    .update({ generated_pdf_path: storagePath })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath(`/pmi-reports/${id}`)
  return {}
}
