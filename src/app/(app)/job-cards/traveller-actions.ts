"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { advancedJobCardSchema, signOffSchema, linkWpsMasterSchema, type AdvancedJobCardInput, type SignOffInput } from "@/lib/validations/job-card"
import { ndeRecordSchema, type NdeRecordInput } from "@/lib/validations/nde-record"
import { airTestSchema, type AirTestInput } from "@/lib/validations/air-test"
import type { UserRole } from "@/types/database"

function nullify(v: string | undefined | null): string | null {
  return v?.trim() || null
}

// ─────────────────────────────────────────────────────────────────────────────
// upsertJobCardAdvancedDetails
// Admin / Engineer / QA can update product + material fields
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertJobCardAdvancedDetails(
  jobCardId: string,
  raw: AdvancedJobCardInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = advancedJobCardSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const d = parsed.data

  const { error } = await supabase
    .from("job_cards")
    .update({
      product_group:        nullify(d.product_group),
      buyer:                nullify(d.buyer),
      material_code:        nullify(d.material_code),
      valve_size_class:     nullify(d.valve_size_class),
      valve_type_component: nullify(d.valve_type_component),
      base_material:        nullify(d.base_material),
      overlay_material:     nullify(d.overlay_material),
      base_material_grade:  nullify(d.base_material_grade),
      regularization:       nullify(d.regularization),
      ring:                 nullify(d.ring),
      ring_heat_no:         nullify(d.ring_heat_no),
      mpi_rt_no:            nullify(d.mpi_rt_no),
      welding_process:      nullify(d.welding_process),
      punching_details:     nullify(d.punching_details),
      other_details:        nullify(d.other_details),
    })
    .eq("id", jobCardId)

  if (error) return { error: error.message }
  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// upsertSignOff
// Role-scoped: engineer→production, qa→qc, accounts→stores, admin→all
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertSignOff(
  jobCardId: string,
  raw: SignOffInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer", "qa", "accounts"])
  if (guard.error) return { error: guard.error }
  const { supabase, role } = guard

  const parsed = signOffSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const d = parsed.data

  const r = role as UserRole

  const { error } = await supabase
    .from("job_cards")
    .update({
      ...(r === "admin" || r === "engineer" ? {
        production_checked_by:   nullify(d.production_checked_by),
        production_checked_date: nullify(d.production_checked_date),
      } : {}),
      ...(r === "admin" || r === "qa" ? {
        qc_checked_by:   nullify(d.qc_checked_by),
        qc_checked_date: nullify(d.qc_checked_date),
      } : {}),
      ...(r === "admin" || r === "accounts" ? {
        stores_checked_by:   nullify(d.stores_checked_by),
        stores_checked_date: nullify(d.stores_checked_date),
      } : {}),
    })
    .eq("id", jobCardId)
  if (error) return { error: error.message }
  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// upsertNdeRecord — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertNdeRecord(
  jobCardId: string,
  recordId: string | null,
  raw: NdeRecordInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = ndeRecordSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const d = parsed.data

  const row = {
    job_card_id:           jobCardId,
    nde_type:              d.nde_type,
    procedure_ref:         nullify(d.procedure_ref),
    report_number:         nullify(d.report_number),
    inspection_date:       nullify(d.inspection_date),
    inspected_by:          nullify(d.inspected_by),
    stage_of_test:         nullify(d.stage_of_test),
    surface_condition:     nullify(d.surface_condition),
    temperature_of_part:   d.temperature_of_part ? parseFloat(d.temperature_of_part) : null,
    type_of_penetrant:     nullify(d.type_of_penetrant),
    penetrant_application: nullify(d.penetrant_application),
    penetrant_removal:     nullify(d.penetrant_removal),
    penetrant_dwell_time:  d.penetrant_dwell_time ? parseFloat(d.penetrant_dwell_time) : null,
    developer_application: nullify(d.developer_application),
    developer_dwell_time:  d.developer_dwell_time ? parseFloat(d.developer_dwell_time) : null,
    post_cleaning:         nullify(d.post_cleaning),
    evaluation:            nullify(d.evaluation),
    result:                d.result,
    notes:                 nullify(d.notes),
    chemical_1_id:         d.chemical_1_id ?? null,
    chemical_2_id:         d.chemical_2_id ?? null,
    chemical_3_id:         d.chemical_3_id ?? null,
    chemical_4_id:         d.chemical_4_id ?? null,
    test_coupon_number:    nullify(d.test_coupon_number),
    deposit_thickness:     nullify(d.deposit_thickness),
    hardness_requirement:  nullify(d.hardness_requirement),
    nde_number:            nullify(d.nde_number),
    duration:              nullify(d.duration),
    observer:              nullify(d.observer),
    chemicals_used_json:   d.chemicals_used ?? [],
    created_by:            user.id,
  }

  if (recordId) {
    const { error } = await supabase.from("nde_records").update(row).eq("id", recordId)
    if (error) return { error: error.message }
    revalidatePath(`/job-cards/${jobCardId}`)
    return {}
  } else {
    const { data, error } = await supabase
      .from("nde_records")
      .insert(row)
      .select("id")
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/job-cards/${jobCardId}`)
    return { id: (data as { id: string }).id }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// upsertAirTestRecord — admin + engineer + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertAirTestRecord(
  jobCardId: string,
  recordId: string | null,
  raw: AirTestInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = airTestSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const d = parsed.data

  const row = {
    job_card_id:  jobCardId,
    tester_name:  nullify(d.tester_name),
    pressure:     nullify(d.pressure),
    duration:     nullify(d.duration),
    result:       d.result,
    notes:        nullify(d.notes),
    created_by:   user.id,
  }

  if (recordId) {
    const { error } = await supabase.from("air_test_records").update(row).eq("id", recordId)
    if (error) return { error: error.message }
    revalidatePath(`/job-cards/${jobCardId}`)
    return {}
  } else {
    const { data, error } = await supabase
      .from("air_test_records")
      .insert(row)
      .select("id")
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/job-cards/${jobCardId}`)
    return { id: (data as { id: string }).id }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// linkWpsMaster — admin + qa
// Links an approved WPS Master to a wps_qualification row
// ─────────────────────────────────────────────────────────────────────────────
export async function linkWpsMaster(
  qualificationId: string,
  jobCardId: string,
  raw: { wps_master_id: string },
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = linkWpsMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  // Verify the WPS Master is approved
  const { data: master } = await supabase
    .from("wps_master")
    .select("id, status")
    .eq("id", parsed.data.wps_master_id)
    .single()

  if (!master || (master as { status: string }).status !== "approved") {
    return { error: "Only approved WPS Masters can be linked." }
  }

  const { error } = await supabase
    .from("wps_qualifications")
    .update({ wps_master_id: parsed.data.wps_master_id })
    .eq("id", qualificationId)

  if (error) return { error: error.message }
  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// unlinkWpsMaster — admin + qa
// ─────────────────────────────────────────────────────────────────────────────
export async function unlinkWpsMaster(
  qualificationId: string,
  jobCardId: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("wps_qualifications")
    .update({ wps_master_id: null })
    .eq("id", qualificationId)

  if (error) return { error: error.message }
  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}
