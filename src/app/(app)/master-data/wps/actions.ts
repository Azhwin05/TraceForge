"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { wpsMasterSchema, type WpsMasterInput } from "@/lib/validations/wps-master"
import type { WpsMasterStatus } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildJsonFields(data: WpsMasterInput) {
  const gas_json =
    data.gas_shielding || data.gas_backing
      ? { shielding: data.gas_shielding ?? null, backing: data.gas_backing ?? null }
      : null

  const electrical_params_json =
    data.elec_polarity || data.elec_current_range || data.elec_voltage_range ||
    data.elec_travel_speed || data.elec_heat_input
      ? {
          polarity:      data.elec_polarity      ?? null,
          current_range: data.elec_current_range ?? null,
          voltage_range: data.elec_voltage_range ?? null,
          travel_speed:  data.elec_travel_speed  ?? null,
          heat_input:    data.elec_heat_input     ?? null,
        }
      : null

  const technique_json =
    data.tech_bead_type || data.tech_oscillation || data.tech_pass_type || data.tech_back_gouging
      ? {
          bead_type:    data.tech_bead_type    ?? null,
          oscillation:  data.tech_oscillation  ?? null,
          pass_type:    data.tech_pass_type    ?? null,
          back_gouging: data.tech_back_gouging ?? null,
        }
      : null

  return { gas_json, electrical_params_json, technique_json }
}

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// createWpsMaster
// ─────────────────────────────────────────────────────────────────────────────
export async function createWpsMaster(
  raw: WpsMasterInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = wpsMasterSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  }
  const data = parsed.data
  const { gas_json, electrical_params_json, technique_json } = buildJsonFields(data)

  const { data: row, error } = await supabase
    .from("wps_master")
    .insert({
      wps_no:                sanitize(data.wps_no) ?? "",
      pqr_no:                sanitize(data.pqr_no),
      welding_process:       sanitize(data.welding_process),
      type:                  sanitize(data.type),
      scope:                 sanitize(data.scope),
      joint_design:          sanitize(data.joint_design),
      base_material:         sanitize(data.base_material),
      filler_material:       sanitize(data.filler_material),
      filler_aws_class:      sanitize(data.filler_aws_class),
      filler_size:           sanitize(data.filler_size),
      position:              sanitize(data.position),
      preheat_min:           data.preheat_min ? parseFloat(data.preheat_min) : null,
      interpass_max:         data.interpass_max ? parseFloat(data.interpass_max) : null,
      pwht_required:         data.pwht_required,
      pwht_temp_min:         data.pwht_temp_min ? parseFloat(data.pwht_temp_min) : null,
      pwht_temp_max:         data.pwht_temp_max ? parseFloat(data.pwht_temp_max) : null,
      pwht_time_range:       sanitize(data.pwht_time_range),
      gas_json,
      electrical_params_json,
      technique_json,
      approved_by:           sanitize(data.approved_by),
      reviewed_by:           sanitize(data.reviewed_by),
      revision:              sanitize(data.revision) ?? "Rev 0",
      effective_date:        data.effective_date || null,
      notes:                 sanitize(data.notes),
      status:                "draft" as WpsMasterStatus,
      created_by:            user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/master-data/wps")
  return { id: (row as { id: string }).id }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateWpsMaster
// ─────────────────────────────────────────────────────────────────────────────
export async function updateWpsMaster(
  id: string,
  raw: WpsMasterInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, profile } = guard

  const parsed = wpsMasterSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  }
  const data = parsed.data

  // QA can only edit drafts; admin can edit any non-superseded
  if (profile?.role === "qa") {
    const { data: existing } = await supabase
      .from("wps_master")
      .select("status")
      .eq("id", id)
      .single()
    if (!existing) return { error: "WPS record not found." }
    if ((existing as { status: string }).status !== "draft") {
      return { error: "QA can only edit WPS records in Draft status." }
    }
  }

  const { gas_json, electrical_params_json, technique_json } = buildJsonFields(data)

  const { error } = await supabase
    .from("wps_master")
    .update({
      wps_no:                sanitize(data.wps_no) ?? "",
      pqr_no:                sanitize(data.pqr_no),
      welding_process:       sanitize(data.welding_process),
      type:                  sanitize(data.type),
      scope:                 sanitize(data.scope),
      joint_design:          sanitize(data.joint_design),
      base_material:         sanitize(data.base_material),
      filler_material:       sanitize(data.filler_material),
      filler_aws_class:      sanitize(data.filler_aws_class),
      filler_size:           sanitize(data.filler_size),
      position:              sanitize(data.position),
      preheat_min:           data.preheat_min ? parseFloat(data.preheat_min) : null,
      interpass_max:         data.interpass_max ? parseFloat(data.interpass_max) : null,
      pwht_required:         data.pwht_required,
      pwht_temp_min:         data.pwht_temp_min ? parseFloat(data.pwht_temp_min) : null,
      pwht_temp_max:         data.pwht_temp_max ? parseFloat(data.pwht_temp_max) : null,
      pwht_time_range:       sanitize(data.pwht_time_range),
      gas_json,
      electrical_params_json,
      technique_json,
      approved_by:           sanitize(data.approved_by),
      reviewed_by:           sanitize(data.reviewed_by),
      revision:              sanitize(data.revision) ?? "Rev 0",
      effective_date:        data.effective_date || null,
      notes:                 sanitize(data.notes),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/master-data/wps")
  revalidatePath(`/master-data/wps/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// approveWpsMaster — admin only, transitions draft → approved
// ─────────────────────────────────────────────────────────────────────────────
export async function approveWpsMaster(
  id: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing, error: fetchErr } = await supabase
    .from("wps_master")
    .select("status")
    .eq("id", id)
    .single()

  if (fetchErr || !existing) return { error: "WPS record not found." }
  if ((existing as { status: string }).status !== "draft") {
    return { error: "Only Draft WPS records can be approved." }
  }

  const { error } = await supabase
    .from("wps_master")
    .update({ status: "approved" as WpsMasterStatus })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/master-data/wps")
  revalidatePath(`/master-data/wps/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// supersedeWpsMaster — admin only, transitions approved → superseded
// ─────────────────────────────────────────────────────────────────────────────
export async function supersedeWpsMaster(
  id: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing, error: fetchErr } = await supabase
    .from("wps_master")
    .select("status")
    .eq("id", id)
    .single()

  if (fetchErr || !existing) return { error: "WPS record not found." }
  if ((existing as { status: string }).status !== "approved") {
    return { error: "Only Approved WPS records can be superseded." }
  }

  const { error } = await supabase
    .from("wps_master")
    .update({ status: "superseded" as WpsMasterStatus })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/master-data/wps")
  revalidatePath(`/master-data/wps/${id}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// createWpsMasterAndRedirect — used by the /new form (server action form submit)
// ─────────────────────────────────────────────────────────────────────────────
export async function createWpsMasterAndRedirect(
  raw: WpsMasterInput,
): Promise<{ error?: string }> {
  const result = await createWpsMaster(raw)
  if (result.error) return { error: result.error }
  redirect(`/master-data/wps/${result.id}`)
}
