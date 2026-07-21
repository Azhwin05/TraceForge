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

  // The polarity columns have a CHECK (DCRP/DCSP/AC) that allows null but not
  // an empty string. The form sends "" for the blank "—" option (and for
  // non-welding steps that never show the field), so normalize "" -> null.
  const payload = {
    ...data,
    polarity:         data.polarity && data.polarity.trim() ? data.polarity : null,
    polarity_planned: data.polarity_planned && data.polarity_planned.trim() ? data.polarity_planned : null,
  }

  if (executionId) {
    const { error } = await supabase
      .from("process_executions")
      .update(payload)
      .eq("id", executionId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("process_executions")
      .insert({ ...payload, job_card_id: jobCardId })
    if (error) return { error: error.message }
  }

  revalidatePath(`/job-cards/${jobCardId}`)
  return {}
}

export async function updateProcessStatus(
  executionId: string,
  jobCardId: string,
  status: "assigned" | "in_progress" | "completed" | "skipped",
  overrideReason?: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, role } = guard
  const isAdmin = role === "admin"

  // Skipping a step is an authorized bypass — admin only.
  if (status === "skipped" && !isAdmin) {
    return { error: "Only an administrator can skip an operation." }
  }

  // Sequential gate (mirrors the DB trigger) — give a readable message before the
  // DB raises. Only relevant when advancing a routed operation forward.
  if (status === "in_progress" || status === "completed") {
    const { data: target } = await supabase
      .from("process_executions")
      .select("sequence_no, operation_type")
      .eq("id", executionId)
      .single()

    if (target?.operation_type && target.sequence_no != null) {
      const { data: earlier } = await supabase
        .from("process_executions")
        .select("operation_type, sequence_no, status")
        .eq("job_card_id", jobCardId)
        .not("sequence_no", "is", null)
        .lt("sequence_no", target.sequence_no)
        .not("status", "in", "(completed,skipped)")
        .order("sequence_no", { ascending: true })

      if (earlier && earlier.length > 0 && !isAdmin) {
        const list = earlier.map((e) => `${e.operation_type} (#${e.sequence_no})`).join(", ")
        return { error: `Complete earlier steps first: ${list}` }
      }
    }
  }

  const update: {
    status: "assigned" | "in_progress" | "completed" | "skipped"
    started_at?: string
    completed_at?: string
    override_reason?: string
  } = { status }
  if (status === "in_progress") update.started_at = new Date().toISOString()
  if (status === "completed") update.completed_at = new Date().toISOString()
  if (overrideReason) update.override_reason = overrideReason

  // Return the updated row so we can detect a 0-row update. RLS can silently
  // filter an UPDATE (HTTP 200, no error, 0 rows), which would otherwise be
  // reported to the user as a false success.
  const { data: updated, error } = await supabase
    .from("process_executions")
    .update(update)
    .eq("id", executionId)
    .select("id")

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) {
    return { error: "Update was not applied — you may not have permission to change this operation." }
  }
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

  // Gate: job must be in dispatch_ready status AND physically validated
  const { data: jc } = await supabase
    .from("job_cards")
    .select("status, dispatch_validated_at")
    .eq("id", jobCardId)
    .single()

  if (jc?.status !== "dispatch_ready") {
    return { error: "Job card must be in dispatch_ready status before dispatching" }
  }

  if (!jc?.dispatch_validated_at) {
    return { error: "Product must be physically verified (Ready to Dispatch) before dispatching" }
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

/**
 * Physical dispatch validation — an Admin or QA user confirms they have
 * inspected the finished product in real life and it is Ready to Dispatch.
 * Toggling off clears the validation. Only allowed while in dispatch_ready.
 */
export async function validateDispatch(
  jobCardId: string,
  validated: boolean
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { data: jc } = await supabase
    .from("job_cards")
    .select("status")
    .eq("id", jobCardId)
    .single()

  if (jc?.status !== "dispatch_ready") {
    return { error: "Job card must be in the Dispatch stage to validate" }
  }

  const { error } = await supabase
    .from("job_cards")
    .update({
      dispatch_validated_by: validated ? user.id : null,
      dispatch_validated_at: validated ? new Date().toISOString() : null,
    })
    .eq("id", jobCardId)

  if (error) return { error: error.message }

  revalidatePath(`/job-cards/${jobCardId}`)
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
