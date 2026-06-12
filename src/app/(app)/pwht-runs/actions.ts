"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import type { CreatePwhtRunInput } from "@/lib/validations/pwht-run"
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
