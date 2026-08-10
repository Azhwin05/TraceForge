"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { machineSchema, type MachineInput } from "@/lib/validations/machine"
import { sanitizeError } from "@/lib/security"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createMachine(
  raw: MachineInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = machineSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("machines")
    .insert({
      machine_code: data.machine_code.trim(),
      name:         data.name.trim(),
      category:     data.category,
      location:     sanitize(data.location),
      notes:        sanitize(data.notes),
      is_active:    true,
    })
    .select("id")
    .single()

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/master-data/machines")
  return { id: (row as { id: string }).id }
}

export async function updateMachine(
  id: string,
  raw: MachineInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = machineSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("machines")
    .update({
      machine_code: data.machine_code.trim(),
      name:         data.name.trim(),
      category:     data.category,
      location:     sanitize(data.location),
      notes:        sanitize(data.notes),
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/master-data/machines")
  revalidatePath(`/master-data/machines/${id}`)
  return {}
}
