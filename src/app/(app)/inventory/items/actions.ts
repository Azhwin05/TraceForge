"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { itemMasterSchema, type ItemMasterInput } from "@/lib/validations/item-master"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createItemMaster(
  raw: ItemMasterInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = itemMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("item_master")
    .insert({
      item_code:        data.item_code.trim(),
      item_name:        data.item_name.trim(),
      category:         data.category,
      uom:              data.uom.trim(),
      hsn_code:         sanitize(data.hsn_code),
      min_stock_level:  data.min_stock_level,
      description:      sanitize(data.description),
      is_active:        true,
      created_by:       user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/inventory/items")
  return { id: (row as { id: string }).id }
}

export async function updateItemMaster(
  id: string,
  raw: ItemMasterInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = itemMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("item_master")
    .update({
      item_code:        data.item_code.trim(),
      item_name:        data.item_name.trim(),
      category:         data.category,
      uom:              data.uom.trim(),
      hsn_code:         sanitize(data.hsn_code),
      min_stock_level:  data.min_stock_level,
      description:      sanitize(data.description),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/inventory/items")
  revalidatePath(`/inventory/items/${id}`)
  return {}
}

export async function toggleItemMasterActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase.from("item_master").update({ is_active: isActive }).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/inventory/items")
  return {}
}
