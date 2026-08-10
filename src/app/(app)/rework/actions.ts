"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { reworkSchema, reworkUpdateSchema } from "@/lib/validations/rework"
import type { ReworkInput, ReworkUpdateInput } from "@/lib/validations/rework"

const WRITE_ROLES = ["admin", "operator", "engineer", "qa"] as const

function blankToNull(v: string | null | undefined): string | null {
  return v && v.trim() ? v.trim() : null
}

export async function createRework(
  data: ReworkInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole([...WRITE_ROLES])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  // Re-validate server-side: the client schema can be bypassed entirely.
  const parsed = reworkSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rework details" }
  }
  const d = parsed.data

  const { data: row, error } = await supabase
    .from("rework_records")
    .insert({
      job_card_id:       d.job_card_id,
      rework_date:       d.rework_date,
      stage:             d.stage.trim(),
      reason:            d.reason.trim(),
      quantity:          d.quantity,
      identified_by:     d.identified_by ?? null,
      performed_by:      d.performed_by ?? null,
      corrective_action: blankToNull(d.corrective_action),
      status:            d.status,
      notes:             blankToNull(d.notes),
      created_by:        user.id,
    })
    .select("id")
    .single()

  if (error) { console.error("[rework] create", error); return { error: sanitizeError(error) } }

  revalidatePath("/rework")
  revalidatePath(`/job-cards/${d.job_card_id}`)
  return { id: row.id }
}

export async function updateRework(
  id: string,
  data: ReworkUpdateInput
): Promise<{ error?: string }> {
  const guard = await requireRole([...WRITE_ROLES])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = reworkUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rework details" }
  }
  const d = parsed.data

  const { data: row, error } = await supabase
    .from("rework_records")
    .update({
      rework_date:       d.rework_date,
      stage:             d.stage.trim(),
      reason:            d.reason.trim(),
      quantity:          d.quantity,
      identified_by:     d.identified_by ?? null,
      performed_by:      d.performed_by ?? null,
      corrective_action: blankToNull(d.corrective_action),
      status:            d.status,
      notes:             blankToNull(d.notes),
    })
    .eq("id", id)
    .select("job_card_id")
    .single()

  if (error) { console.error("[rework] update", error); return { error: sanitizeError(error) } }

  revalidatePath("/rework")
  revalidatePath(`/job-cards/${row.job_card_id}`)
  return {}
}

export async function deleteRework(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  // Read the parent first so the job-card page can be revalidated after the
  // row is gone.
  const { data: row } = await supabase
    .from("rework_records").select("job_card_id").eq("id", id).maybeSingle()

  const { error } = await supabase.from("rework_records").delete().eq("id", id)
  if (error) { console.error("[rework] delete", error); return { error: sanitizeError(error) } }

  revalidatePath("/rework")
  if (row?.job_card_id) revalidatePath(`/job-cards/${row.job_card_id}`)
  return {}
}
