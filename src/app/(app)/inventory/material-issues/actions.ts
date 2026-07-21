"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { materialIssueSchema, type MaterialIssueInput, consumptionSchema, type ConsumptionInput } from "@/lib/validations/material-issue"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createMaterialIssue(
  raw: MaterialIssueInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "operator", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = materialIssueSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: numberResult, error: numberError } = await supabase.rpc("generate_material_issue_number")
  if (numberError) return { error: numberError.message }

  const { data: issue, error } = await supabase
    .from("material_issues")
    .insert({
      issue_number:  numberResult as string,
      job_card_id:    data.job_card_id ? data.job_card_id : null,
      issued_by:      user.id,
      issued_to:      sanitize(data.issued_to),
      remarks:        sanitize(data.remarks),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  const issueId = (issue as { id: string }).id

  // Insert one at a time: the DB trigger checks stock sufficiency per row
  // and needs to surface which specific item ran out.
  for (const item of data.items) {
    const { error: itemError } = await supabase.from("material_issue_items").insert({
      material_issue_id:    issueId,
      item_id:               item.item_id,
      storage_location_id:   item.storage_location_id,
      issued_qty:             item.issued_qty,
      uom:                    item.uom,
      remarks:                sanitize(item.remarks),
    })
    if (itemError) return { error: itemError.message }
  }

  revalidatePath("/inventory/material-issues")
  revalidatePath("/inventory/stock")
  return { id: issueId }
}

/**
 * Confirm how much of an issue was actually consumed against the job. For each
 * line, the unused balance (issued - consumed) is written to returned_qty; the
 * DB trigger (after_material_issue_consumption) then returns that quantity to
 * stock at the rate it left at. Marks the issue consumption_status = confirmed.
 */
export async function confirmConsumption(
  issueId: string,
  raw: ConsumptionInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "operator", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = consumptionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  // Load the issue's lines so we can validate consumed <= issued and it isn't
  // already confirmed (which would double-count a return).
  const { data: issue, error: loadError } = await supabase
    .from("material_issues")
    .select("id, consumption_status, material_issue_items(id, issued_qty, consumed_qty)")
    .eq("id", issueId)
    .single()

  if (loadError || !issue) return { error: "Issue not found" }
  if (issue.consumption_status === "confirmed") {
    return { error: "Usage has already been confirmed for this issue." }
  }

  const lines = (issue.material_issue_items ?? []) as { id: string; issued_qty: number; consumed_qty: number | null }[]
  const byId = new Map(lines.map((l) => [l.id, l]))

  for (const entry of parsed.data.items) {
    const line = byId.get(entry.id)
    if (!line) return { error: "Issue line not found" }
    if (entry.consumed_qty > line.issued_qty) {
      return { error: `Used quantity (${entry.consumed_qty}) cannot exceed issued (${line.issued_qty}).` }
    }
  }

  // One UPDATE per line; the trigger appends a return-to-stock ledger row when
  // returned_qty > 0. Update per-row so a failure surfaces the specific line.
  for (const entry of parsed.data.items) {
    const line = byId.get(entry.id)!
    const returned = Number((line.issued_qty - entry.consumed_qty).toFixed(3))
    const { error: rowError } = await supabase
      .from("material_issue_items")
      .update({ consumed_qty: entry.consumed_qty, returned_qty: returned })
      .eq("id", entry.id)
    if (rowError) return { error: rowError.message }
  }

  const { error: statusError } = await supabase
    .from("material_issues")
    .update({ consumption_status: "confirmed" })
    .eq("id", issueId)
  if (statusError) return { error: statusError.message }

  revalidatePath(`/inventory/material-issues/${issueId}`)
  revalidatePath("/inventory/material-issues")
  revalidatePath("/inventory/stock")
  revalidatePath("/inventory")
  return {}
}
