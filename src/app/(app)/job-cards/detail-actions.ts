"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import type { ProcessExecutionInput, DispatchInput, AccountsInput } from "@/lib/validations/process-execution"

export async function upsertProcessExecution(
  jobCardId: string,
  executionId: string | null,
  data: ProcessExecutionInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  if (executionId) {
    const { error } = await supabase
      .from("process_executions")
      .update({ ...data })
      .eq("id", executionId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("process_executions")
      .insert({ ...data, job_card_id: jobCardId })
    if (error) return { error: error.message }
  }

  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}

export async function updateProcessStatus(
  executionId: string,
  jobCardId: string,
  status: "assigned" | "in_progress" | "completed"
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const update: {
    status: "assigned" | "in_progress" | "completed"
    started_at?: string
    completed_at?: string
  } = { status }
  if (status === "in_progress") update.started_at = new Date().toISOString()
  if (status === "completed") update.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from("process_executions")
    .update(update)
    .eq("id", executionId)

  if (error) return { error: error.message }
  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}

export async function createDispatch(
  jobCardId: string,
  data: DispatchInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  // Gate: job must be in dispatch_ready status
  const { data: jc } = await supabase
    .from("job_cards")
    .select("status")
    .eq("id", jobCardId)
    .single()

  if (jc?.status !== "dispatch_ready") {
    return { error: "Job card must be in dispatch_ready status before dispatching" }
  }

  // Document gates — approved WPS / inspection reports / PWHT (if required).
  // The DB trigger enforces the same rules; this gives a readable error first.
  const { data: blockers } = await supabase
    .rpc("job_card_gate_blockers", { p_job_card_id: jobCardId, p_new_status: "dispatched" })
  if (Array.isArray(blockers) && blockers.length > 0) {
    return { error: `Dispatch blocked: ${blockers.join("; ")}` }
  }

  const { error: dispatchError } = await supabase
    .from("dispatches")
    .insert({
      job_card_id: jobCardId,
      dc_number: data.dc_number,
      dispatch_date: data.dispatch_date,
      vehicle_details: data.vehicle_details || null,
      remarks: data.remarks || null,
      doc_url: data.doc_url || null,
      created_by: user.id,
    })

  if (dispatchError) return { error: dispatchError.message }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "dispatched", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: statusError.message }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return {}
}

export async function upsertAccounts(
  jobCardId: string,
  accountId: string | null,
  data: AccountsInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "accounts"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  if (accountId) {
    const { error } = await supabase
      .from("accounts")
      .update({ ...data, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", accountId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("accounts")
      .insert({ ...data, job_card_id: jobCardId, updated_by: user.id })
    if (error) return { error: error.message }
  }

  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}
