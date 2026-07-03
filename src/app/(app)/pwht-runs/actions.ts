"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { parseChartCsv } from "@/lib/pwht/chart-csv"
import {
  chartReadingSchema,
  updatePwhtDetailsSchema,
  type CreatePwhtRunInput,
  type ChartReadingInput,
  type UpdatePwhtDetailsInput,
} from "@/lib/validations/pwht-run"
import type { PwhtJobStatus } from "@/types/database"

export async function createPwhtRun(
  data: CreatePwhtRunInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { data: run, error } = await supabase
    .from("pwht_runs")
    .insert({
      chart_number: data.chart_number,
      furnace_id: data.furnace_id,
      operator_name: data.operator_name,
      loading_temp: data.loading_temp,
      soaking_temp: data.soaking_temp,
      soaking_time: data.soaking_time,
      rate_of_heating: data.rate_of_heating,
      date_of_cycle: data.date_of_cycle,
      doc_url: data.doc_url || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  const { error: jobsError } = await supabase
    .from("pwht_run_jobs")
    .insert(
      data.job_card_ids.map((jcId) => ({
        pwht_run_id: run.id,
        job_card_id: jcId,
        status: "pending" as PwhtJobStatus,
        is_final: false,
      }))
    )

  if (jobsError) return { error: jobsError.message }

  revalidatePath("/pwht-runs")
  return { id: run.id }
}

export async function updatePwhtJobStatus(
  jobId: string,
  status: PwhtJobStatus
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("pwht_run_jobs")
    .update({ status })
    .eq("id", jobId)
  if (error) return { error: error.message }
  revalidatePath("/pwht-runs")
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart recorder — run details
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePwhtRunDetails(
  runId: string,
  data: UpdatePwhtDetailsInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = updatePwhtDetailsSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { error } = await supabase
    .from("pwht_runs")
    .update({
      component_identification: parsed.data.component_identification || null,
      wps_number:               parsed.data.wps_number || null,
      cycle_start:              parsed.data.cycle_start || null,
      cycle_end:                parsed.data.cycle_end || null,
      rate_of_cooling:          parsed.data.rate_of_cooling ?? null,
      notes:                    parsed.data.notes || null,
    })
    .eq("id", runId)

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart recorder — readings (manual entry)
// ─────────────────────────────────────────────────────────────────────────────
export async function addChartReading(
  runId: string,
  data: ChartReadingInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = chartReadingSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { error } = await supabase.from("pwht_chart_readings").insert({
    pwht_run_id:   runId,
    channel:       parsed.data.channel || "TC1",
    recorded_at:   parsed.data.recorded_at,
    temperature_c: parsed.data.temperature_c,
    source:        "manual",
    created_by:    user.id,
  })

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  return {}
}

export async function deleteChartReading(
  readingId: string,
  runId: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("pwht_chart_readings")
    .delete()
    .eq("id", readingId)

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart recorder — CSV import from the recorder's export
// ─────────────────────────────────────────────────────────────────────────────
export async function importChartCsv(
  runId: string,
  csvText: string,
  channel?: string
): Promise<{ error?: string; imported?: number; skipped?: number }> {
  const guard = await requireRole(["admin", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  if (typeof csvText !== "string" || csvText.length > 2_000_000) {
    return { error: "File too large — maximum import size is 2 MB." }
  }

  // Base time for elapsed-minutes CSVs: the run's cycle start, else its date
  const { data: run } = await supabase
    .from("pwht_runs")
    .select("cycle_start, date_of_cycle, approval_status, submitted_to_customer")
    .eq("id", runId)
    .single()

  if (!run) return { error: "PWHT run not found" }
  const runRow = run as { cycle_start: string | null; date_of_cycle: string; approval_status: string; submitted_to_customer: boolean }
  if (runRow.approval_status === "approved" || runRow.submitted_to_customer) {
    return { error: "Chart readings are locked: the PWHT run is approved or submitted to customer." }
  }

  const baseTime = runRow.cycle_start
    ? new Date(runRow.cycle_start)
    : new Date(`${runRow.date_of_cycle}T00:00:00`)

  const result = parseChartCsv(csvText, { baseTime, defaultChannel: channel })
  if (result.error !== null) return { error: result.error }

  // Upsert so a re-import of the same file doesn't fail on the unique constraint
  const { error } = await supabase.from("pwht_chart_readings").upsert(
    result.readings.map((r) => ({
      pwht_run_id:   runId,
      channel:       r.channel,
      recorded_at:   r.recorded_at,
      temperature_c: r.temperature_c,
      source:        "import" as const,
      created_by:    user.id,
    })),
    { onConflict: "pwht_run_id,channel,recorded_at" }
  )

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  return { imported: result.readings.length, skipped: result.skipped }
}

// ─────────────────────────────────────────────────────────────────────────────
// Approval workflow — draft → submitted → approved / rejected
// ─────────────────────────────────────────────────────────────────────────────
export async function submitPwhtRun(runId: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("pwht_runs")
    .select("approval_status")
    .eq("id", runId)
    .single()

  if (!existing || (existing as { approval_status: string }).approval_status !== "draft") {
    return { error: "Only draft PWHT runs can be submitted for approval." }
  }

  // A run without chart data is not submittable — the chart IS the evidence.
  const { count } = await supabase
    .from("pwht_chart_readings")
    .select("id", { count: "exact", head: true })
    .eq("pwht_run_id", runId)

  if (!count || count === 0) {
    return { error: "Cannot submit for approval: no chart recorder readings have been captured for this run." }
  }

  const { error } = await supabase
    .from("pwht_runs")
    .update({ approval_status: "submitted" })
    .eq("id", runId)

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  revalidatePath("/pwht-runs")
  return {}
}

export async function approvePwhtRun(runId: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: existing } = await supabase
    .from("pwht_runs")
    .select("approval_status")
    .eq("id", runId)
    .single()

  if (!existing || (existing as { approval_status: string }).approval_status !== "submitted") {
    return { error: "Only submitted PWHT runs can be approved." }
  }

  const { error } = await supabase
    .from("pwht_runs")
    .update({ approval_status: "approved" })
    .eq("id", runId)

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  revalidatePath("/pwht-runs")
  return {}
}

export async function rejectPwhtRun(
  runId: string,
  reason: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  if (!reason || reason.trim().length < 5) {
    return { error: "A rejection reason (at least 5 characters) is required." }
  }

  const { data: existing } = await supabase
    .from("pwht_runs")
    .select("approval_status")
    .eq("id", runId)
    .single()

  const st = (existing as { approval_status: string } | null)?.approval_status
  if (st !== "submitted" && st !== "approved") {
    return { error: "Only submitted or approved PWHT runs can be rejected." }
  }

  const { error } = await supabase
    .from("pwht_runs")
    .update({ approval_status: "rejected", rejection_reason: reason.trim() })
    .eq("id", runId)

  if (error) return { error: sanitizeError(error) }
  revalidatePath(`/pwht-runs/${runId}`)
  revalidatePath("/pwht-runs")
  return {}
}
