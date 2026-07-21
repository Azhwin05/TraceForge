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
): Promise<{ error?: string; id?: string; pending?: boolean }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user, role } = guard

  const parsed = itemMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  // Admins approve on creation; engineers' items wait for admin approval.
  const isAdmin = role === "admin"

  const { data: row, error } = await supabase
    .from("item_master")
    .insert({
      item_code:        data.item_code.trim(),
      item_name:        data.item_name.trim(),
      category:         data.category,
      consumable_type:  data.category === "consumable" ? (data.consumable_type ?? null) : null,
      uom:              data.uom.trim(),
      hsn_code:         sanitize(data.hsn_code),
      min_stock_level:  data.min_stock_level,
      description:      sanitize(data.description),
      is_active:        true,
      approval_status:  isAdmin ? "approved" : "pending",
      approved_by:      isAdmin ? user.id : null,
      approved_at:      isAdmin ? new Date().toISOString() : null,
      created_by:       user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/inventory/items")
  return { id: (row as { id: string }).id, pending: !isAdmin }
}

/** Admin-only: approve or reject a pending item. Never touched by the edit action. */
export async function setItemApproval(
  id: string,
  decision: "approved" | "rejected",
  rejectionReason?: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error } = await supabase
    .from("item_master")
    .update({
      approval_status:  decision,
      approved_by:      user.id,
      approved_at:      new Date().toISOString(),
      rejection_reason: decision === "rejected" ? sanitize(rejectionReason) : null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/inventory/items")
  revalidatePath(`/inventory/items/${id}`)
  return {}
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
      consumable_type:  data.category === "consumable" ? (data.consumable_type ?? null) : null,
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
