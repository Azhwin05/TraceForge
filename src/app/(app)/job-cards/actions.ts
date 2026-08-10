"use server"

import { revalidatePath } from "next/cache"
import { requireAuth, requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import type { CreateClientInput, CreateWpsInput, FullJobCardInput } from "@/lib/validations/job-card"
import type { JobCardStatus, UserRole } from "@/types/database"

// Map the full-form input to job_cards columns. Optional blanks become null.
function jobCardColumns(data: FullJobCardInput) {
  const s = (v: string | undefined) => (v && v.trim() ? v.trim() : null)
  return {
    client_id: data.client_id,
    nbdn_number: data.nbdn_number,
    description: data.description,
    quantity: data.quantity,
    process_type: data.process_type,
    received_date: data.received_date,
    po_number: s(data.po_number),
    drawing_number: s(data.drawing_number),
    heat_number: s(data.heat_number),
    part_number: s(data.part_number),
    due_date: s(data.due_date),
    product_group: s(data.product_group),
    buyer: s(data.buyer),
    material_code: s(data.material_code),
    valve_size_class: s(data.valve_size_class),
    valve_type_component: s(data.valve_type_component),
    base_material: s(data.base_material),
    overlay_material: s(data.overlay_material),
    base_material_grade: s(data.base_material_grade),
    regularization: s(data.regularization),
    wps_no: s(data.wps_no),
    ring: s(data.ring),
    ring_heat_no: s(data.ring_heat_no),
    mpi_rt_no: s(data.mpi_rt_no),
    welding_process: s(data.welding_process),
    consumable_brand: s(data.consumable_brand),
    consumable_aws_class: s(data.consumable_aws_class),
    consumable_size: s(data.consumable_size),
    consumable_batch_no: s(data.consumable_batch_no),
    consumable_mfg_date: s(data.consumable_mfg_date),
    weld_deposit_thickness_before: s(data.weld_deposit_thickness_before),
    weld_deposit_thickness_after: s(data.weld_deposit_thickness_after),
    punching_details: s(data.punching_details),
    despatch_dc_no: s(data.despatch_dc_no),
    despatch_date: s(data.despatch_date),
    other_details: s(data.other_details),
    production_checked_by: s(data.production_checked_by),
    production_checked_date: s(data.production_checked_date),
    qc_checked_by: s(data.qc_checked_by),
    qc_checked_date: s(data.qc_checked_date),
    stores_checked_by: s(data.stores_checked_by),
    stores_checked_date: s(data.stores_checked_date),
  }
}

// Welding details that live on the welding process_executions row.
function weldingColumns(data: FullJobCardInput) {
  const s = (v: string | undefined) => (v && v.trim() ? v.trim() : null)
  const n = (v: number | undefined) => (v == null || Number.isNaN(v) ? null : v)
  return {
    welder_name: s(data.welder_name),
    welder_id: s(data.welder_id),
    weld_metal: s(data.weld_metal),
    weld_height: n(data.weld_height),
    weld_qty_planned: n(data.weld_qty_planned),
    weld_qty_actual: n(data.weld_qty_actual),
    weld_date: s(data.weld_date),
    pre_heat_temp_planned: n(data.pre_heat_temp_planned),
    pre_heat_temp: n(data.pre_heat_temp),
    inter_pass_temp_planned: n(data.inter_pass_temp_planned),
    inter_pass_temp: n(data.inter_pass_temp),
    post_heat_temp_planned: n(data.post_heat_temp_planned),
    post_heat_temp: n(data.post_heat_temp),
    amps_required: s(data.amps_required),
    amps_actual: n(data.amps_actual),
    volts_required: s(data.volts_required),
    volts_actual: n(data.volts_actual),
    travel_speed_planned: n(data.travel_speed_planned),
    travel_speed: n(data.travel_speed),
    gas_flow_rate_planned: n(data.gas_flow_rate_planned),
    gas_flow_rate: n(data.gas_flow_rate),
    consumable_feed_rate_planned: n(data.consumable_feed_rate_planned),
    consumable_feed_rate: n(data.consumable_feed_rate),
    polarity_planned: s(data.polarity_planned),
    polarity: s(data.polarity),
  }
}

// True when the form carries at least one welding-detail value worth persisting.
function hasWeldingData(w: ReturnType<typeof weldingColumns>): boolean {
  return Object.values(w).some((v) => v !== null && v !== undefined)
}

// Roles allowed to move a job card TO each status
const STATUS_ALLOWED_ROLES: Record<JobCardStatus, UserRole[]> = {
  created:              ["admin", "operator"],
  wps_pending:          ["admin", "operator", "engineer"],
  wps_uploaded:         ["admin", "qa"],
  wps_approved:         ["admin", "qa"],
  process_assigned:     ["admin", "engineer"],
  in_process:           ["admin", "engineer"],
  process_complete:     ["admin", "engineer", "qa"],
  reports_pending:      ["admin", "qa"],
  reports_complete:     ["admin", "qa"],
  dispatch_ready:       ["admin"],
  dispatched:           ["admin"],
  accounts_processing:  ["admin", "accounts"],
  closed:               ["admin", "accounts"],
  on_hold:              ["admin", "operator", "engineer", "qa", "accounts"],
}

// Write the welding-detail fields onto this job's welding operation row. Best-effort:
// only runs when the form carried welding data and a welding operation exists.
async function applyWeldingDetails(
  supabase: NonNullable<Awaited<ReturnType<typeof requireRole>>["supabase"]>,
  jobCardId: string,
  data: FullJobCardInput
) {
  const welding = weldingColumns(data)
  if (!hasWeldingData(welding)) return

  // Prefer the routed welding operation; fall back to any welding-type execution row.
  const { data: rows } = await supabase
    .from("process_executions")
    .select("id, operation_type, process_type")
    .eq("job_card_id", jobCardId)
    .or("operation_type.eq.welding,process_type.eq.welding")
    .order("sequence_no", { ascending: true, nullsFirst: false })

  const target = rows?.find((r) => r.operation_type === "welding") ?? rows?.[0]
  if (!target) return

  const { error } = await supabase.from("process_executions").update(welding).eq("id", target.id)
  if (error) console.error("[job-cards] welding details update failed:", error.message)
}

export async function createJobCard(
  data: FullJobCardInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "operator", "qa", "engineer", "accounts", "management"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  // Purchase Order is mandatory for new jobs (client request #6). Enforced here
  // as well as in the form, because a server action is a public endpoint — the
  // client-side resolver is a convenience, not a boundary. Edits stay exempt so
  // pre-existing job cards without a PO remain editable.
  if (!data.po_number || !data.po_number.trim()) {
    return { error: "Purchase Order number is required to create a job card." }
  }

  // Atomic jc_number generation using a DB function (avoids COUNT+INSERT race)
  const { data: jcNumberRow, error: seqError } = await supabase
    .rpc("generate_jc_number")
  if (seqError) return { error: sanitizeError(seqError) }
  const jcNumber = jcNumberRow as string

  const { data: jobCard, error } = await supabase
    .from("job_cards")
    .insert({
      jc_number: jcNumber,
      ...jobCardColumns(data),
      status: "created",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) { console.error("[job-cards]", error); return { error: sanitizeError(error) } }

  // Seed the operation routing (Pre-Machining → Welding → … → Deburring) from the
  // selected process types. Best-effort: a seeding failure must not fail creation —
  // an engineer can regenerate the routing from the job card later.
  const { error: seedError } = await supabase
    .rpc("seed_process_operations", { p_job_card_id: jobCard.id })
  if (seedError) console.error("[job-cards] routing seed failed:", seedError.message)

  // Persist any welding details entered on the Job Card form.
  await applyWeldingDetails(supabase, jobCard.id, data)

  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return { id: jobCard.id }
}

// Update an existing Job Card from the same full form (header + welding + closing).
export async function updateFullJobCard(
  jobCardId: string,
  data: FullJobCardInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "operator", "qa", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("job_cards")
    .update(jobCardColumns(data))
    .eq("id", jobCardId)

  if (error) { console.error("[job-cards]", error); return { error: sanitizeError(error) } }

  await applyWeldingDetails(supabase, jobCardId, data)

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return { id: jobCardId }
}

// Set / update the production due date on a job card.
export async function updateJobCardDueDate(
  jobCardId: string,
  dueDate: string | null
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "operator", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("job_cards")
    .update({ due_date: dueDate || null })
    .eq("id", jobCardId)

  if (error) { console.error("[job-cards]", error); return { error: sanitizeError(error) } }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return {}
}

/**
 * Replace a job card's tags (client request #1).
 *
 * Tags are normalised here rather than in the UI so that every write path gets
 * the same treatment: trimmed, lowercased, de-duplicated and capped. Without
 * the lowercasing, "Urgent" and "urgent" would be different tags and the
 * containment search in searchJobCards would miss half of them.
 */
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 40

export async function updateJobCardTags(
  jobCardId: string,
  tags: string[]
): Promise<{ error?: string; tags?: string[] }> {
  const guard = await requireRole(["admin", "operator", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  if (!Array.isArray(tags)) return { error: "Invalid tags." }

  const normalised = Array.from(
    new Set(
      tags
        .map((t) => String(t).trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= MAX_TAG_LENGTH),
    ),
  ).slice(0, MAX_TAGS)

  const { error } = await supabase
    .from("job_cards")
    .update({ tags: normalised })
    .eq("id", jobCardId)

  if (error) { console.error("[job-cards] tags", error); return { error: sanitizeError(error) } }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return { tags: normalised }
}

// Build (or complete) the operation routing for an existing job card.
// Idempotent server-side: seed_process_operations no-ops if routing already exists.
export async function generateRouting(
  jobCardId: string
): Promise<{ error?: string; created?: number }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data, error } = await supabase
    .rpc("seed_process_operations", { p_job_card_id: jobCardId })
  if (error) return { error: sanitizeError(error) }

  revalidatePath(`/job-cards/${jobCardId}`)
  return { created: (data as number) ?? 0 }
}

export async function updateJobCardStatus(
  id: string,
  newStatus: JobCardStatus
): Promise<{ error?: string }> {
  const { profile, supabase } = await requireAuth()
  const role = profile!.role as UserRole

  const allowedRoles = STATUS_ALLOWED_ROLES[newStatus]
  if (!allowedRoles?.includes(role)) {
    return { error: "Unauthorized: your role cannot perform this transition" }
  }

  // Document gates — same rules the DB trigger enforces, checked here first so
  // the user gets a readable list of blockers instead of a raised exception.
  const { data: blockers } = await supabase
    .rpc("job_card_gate_blockers", { p_job_card_id: id, p_new_status: newStatus })
  if (Array.isArray(blockers) && blockers.length > 0) {
    return { error: `Blocked: ${blockers.join("; ")}` }
  }

  // Fetch current status to store as previous_status when going on_hold
  const { data: current } = await supabase
    .from("job_cards")
    .select("status")
    .eq("id", id)
    .single()

  const updatePayload: {
    status: JobCardStatus
    stage_entered_at: string
    previous_status?: JobCardStatus | null
  } = {
    status: newStatus,
    stage_entered_at: new Date().toISOString(),
  }

  if (newStatus === "on_hold" && current?.status) {
    updatePayload.previous_status = current.status as JobCardStatus
  }
  if (newStatus !== "on_hold") {
    updatePayload.previous_status = null
  }

  const { error } = await supabase
    .from("job_cards")
    .update(updatePayload)
    .eq("id", id)

  if (error) { console.error("[job-cards]", error); return { error: sanitizeError(error) } }

  revalidatePath(`/job-cards/${id}`)
  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return {}
}

export async function createClient_(
  data: CreateClientInput
): Promise<{ error?: string; client?: { id: string; name: string } }> {
  const guard = await requireRole(["admin", "operator"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name: data.name,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      address: data.address || null,
    })
    .select("id, name")
    .single()

  if (error) { console.error("[job-cards]", error); return { error: sanitizeError(error) } }
  return { client }
}

export async function submitWps(
  jobCardId: string,
  data: CreateWpsInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error: wpsError } = await supabase
    .from("wps_qualifications")
    .insert({
      job_card_id: jobCardId,
      wps_number: data.wps_number,
      revision: data.revision,
      doc_url: data.doc_url || null,
      approval_status: "pending",
      uploaded_by: user.id,
    })

  if (wpsError) return { error: sanitizeError(wpsError) }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "wps_uploaded", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: sanitizeError(statusError) }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return {}
}

export async function approveWps(
  wpsId: string,
  jobCardId: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error: wpsError } = await supabase
    .from("wps_qualifications")
    .update({
      approval_status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", wpsId)

  if (wpsError) return { error: sanitizeError(wpsError) }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "wps_approved", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: sanitizeError(statusError) }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return {}
}

export async function rejectWps(
  wpsId: string,
  jobCardId: string,
  reason: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error: wpsError } = await supabase
    .from("wps_qualifications")
    .update({
      approval_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", wpsId)

  if (wpsError) return { error: sanitizeError(wpsError) }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "wps_pending", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: sanitizeError(statusError) }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return {}
}

const RECYCLE_BIN_RETENTION_DAYS = 182 // ~6 months

/**
 * Move a job card to the Recycle Bin (soft delete). Nothing cascades and
 * nothing is destroyed — every child row (process steps, reports, dispatches,
 * accounts, dossiers, issues) stays exactly as it is. Fully reversible via
 * restoreJobCard() for RECYCLE_BIN_RETENTION_DAYS, after which the scheduled
 * purge (0042: purge_expired_job_cards) hard-deletes it for real.
 *
 * Admin only. The "undo for 10s" window is handled client-side; by the time
 * this runs the user has chosen not to undo.
 */
export async function deleteJobCard(
  jobCardId: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const purgeAt = new Date(Date.now() + RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // .select() lets us detect an RLS-filtered 0-row update (HTTP 200, no error).
  const { data: updated, error } = await supabase
    .from("job_cards")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, purge_at: purgeAt })
    .eq("id", jobCardId)
    .is("deleted_at", null)
    .select("id")

  if (error) { console.error("[job-cards] delete", error); return { error: sanitizeError(error) } }
  if (!updated || updated.length === 0) {
    return { error: "Delete was not applied — it may already be in the Recycle Bin, or you lack permission." }
  }

  revalidatePath("/job-cards")
  revalidatePath("/job-cards/recycle-bin")
  revalidatePath("/dashboard")
  return {}
}

/** Reverse a soft delete — the job card returns to normal, exactly as it was. Admin only. */
export async function restoreJobCard(
  jobCardId: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: updated, error } = await supabase
    .from("job_cards")
    .update({ deleted_at: null, deleted_by: null, purge_at: null })
    .eq("id", jobCardId)
    .not("deleted_at", "is", null)
    .select("id")

  if (error) { console.error("[job-cards] restore", error); return { error: sanitizeError(error) } }
  if (!updated || updated.length === 0) {
    return { error: "Restore was not applied — it may not be in the Recycle Bin." }
  }

  revalidatePath("/job-cards")
  revalidatePath("/job-cards/recycle-bin")
  revalidatePath("/dashboard")
  return {}
}

/**
 * Admin override: permanently purge everything currently past its retention
 * date right now, instead of waiting for the scheduled job. Returns a summary
 * so the UI can show what was removed vs. what's still blocked (e.g. a
 * customer_dossier with `on delete restrict`).
 */
export async function purgeJobCardsNow(): Promise<
  { error?: string; purged?: number; skipped?: { jcNumber: string; reason: string }[] }
> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data, error } = await supabase.rpc("purge_expired_job_cards")
  if (error) { console.error("[job-cards] purge", error); return { error: sanitizeError(error) } }

  const rows = data ?? []
  revalidatePath("/job-cards/recycle-bin")
  return {
    purged: rows.filter((r) => !r.skipped).length,
    skipped: rows.filter((r) => r.skipped).map((r) => ({ jcNumber: r.jc_number, reason: r.reason ?? "Blocked" })),
  }
}
