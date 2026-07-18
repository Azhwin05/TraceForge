"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { storageLocationSchema, type StorageLocationInput } from "@/lib/validations/storage-location"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createStorageLocation(raw: StorageLocationInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = storageLocationSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("storage_locations")
    .insert({
      code:         data.code.trim(),
      name:         data.name.trim(),
      description:  sanitize(data.description),
      is_active:    true,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/inventory/locations")
  return { id: (row as { id: string }).id }
}

export async function updateStorageLocation(id: string, raw: StorageLocationInput): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = storageLocationSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("storage_locations")
    .update({
      code:         data.code.trim(),
      name:         data.name.trim(),
      description:  sanitize(data.description),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/inventory/locations")
  return {}
}
