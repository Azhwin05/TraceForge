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

/**
 * Permanently delete a storage location. Admin only. Blocked if it has any
 * stock movement history (GRN receipt, material issue, or a stock ledger
 * entry) — none of those FKs cascade, so an in-use location can't actually
 * be deleted; this explains why up front instead of a raw database error.
 */
export async function deleteStorageLocation(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const [{ count: grnCount }, { count: issueCount }, { count: ledgerCount }] = await Promise.all([
    supabase.from("grn_items").select("*", { count: "exact", head: true }).eq("storage_location_id", id),
    supabase.from("material_issue_items").select("*", { count: "exact", head: true }).eq("storage_location_id", id),
    supabase.from("stock_ledger").select("*", { count: "exact", head: true }).eq("storage_location_id", id),
  ])

  if ((grnCount ?? 0) > 0 || (issueCount ?? 0) > 0 || (ledgerCount ?? 0) > 0) {
    return { error: "Cannot delete: this location has stock movement history. Deactivate it instead." }
  }

  const { data: deleted, error } = await supabase
    .from("storage_locations")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) {
    return { error: "Delete was not applied — administrator permission is required." }
  }

  revalidatePath("/inventory/locations")
  return {}
}

export async function toggleStorageLocationActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase.from("storage_locations").update({ is_active: isActive }).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/inventory/locations")
  return {}
}
