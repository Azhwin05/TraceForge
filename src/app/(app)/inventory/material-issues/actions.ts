"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { materialIssueSchema, type MaterialIssueInput } from "@/lib/validations/material-issue"

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
