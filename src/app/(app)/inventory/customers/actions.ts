"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import {
  customerSchema, type CustomerInput,
  customerItemsBatchSchema, type CustomerItemsBatchInput,
  customerItemEditSchema, type CustomerItemEditInput,
} from "@/lib/validations/customer"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

const RECYCLE_BIN_RETENTION_DAYS = 182 // ~6 months, matches the job-card Recycle Bin

// ─────────────────────────────────────────────────────────────
// Customers (the shared `clients` table — same list Job Tracker uses)
// ─────────────────────────────────────────────────────────────

export async function createCustomer(raw: CustomerInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "operator"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("clients")
    .insert({
      name:          data.name.trim(),
      contact_name:  sanitize(data.contact_name),
      contact_email: sanitize(data.contact_email),
      contact_phone: sanitize(data.contact_phone),
      address:       sanitize(data.address),
    })
    .select("id")
    .single()

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/inventory/customers")
  return { id: (row as { id: string }).id }
}

export async function updateCustomer(id: string, raw: CustomerInput): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("clients")
    .update({
      name:          data.name.trim(),
      contact_name:  sanitize(data.contact_name),
      contact_email: sanitize(data.contact_email),
      contact_phone: sanitize(data.contact_phone),
      address:       sanitize(data.address),
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/inventory/customers")
  revalidatePath(`/inventory/customers/${id}`)
  return {}
}

/**
 * Permanently delete a customer. Admin only. Blocked with a readable reason
 * if they have job cards or a customer-item register — those FKs don't
 * cascade, so an in-use customer can't actually be deleted regardless.
 * (Customers are the shared `clients` table with Job Tracker, so this is the
 * simpler guarded hard-delete used for other masters, not a full Recycle
 * Bin — see the migration comment for why.)
 */
export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const [{ count: jobCount }, { count: itemCount }] = await Promise.all([
    supabase.from("job_cards").select("*", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("customer_items").select("*", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
  ])

  if ((jobCount ?? 0) > 0) {
    return { error: "Cannot delete: this customer has job card history." }
  }
  if ((itemCount ?? 0) > 0) {
    return { error: "Cannot delete: this customer still has items on file. Delete those first." }
  }

  const { data: deleted, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) return { error: sanitizeError(error) }
  if (!deleted || deleted.length === 0) {
    return { error: "Delete was not applied — administrator permission is required." }
  }

  revalidatePath("/inventory/customers")
  return {}
}

// ─────────────────────────────────────────────────────────────
// Customer Items
// ─────────────────────────────────────────────────────────────

/**
 * Save a batch of items for a customer in one go. Any row can be left
 * "deferred" — only the name is required — so the operator can move straight
 * to the next item instead of stopping to look up missing details. Deferred
 * rows save with status: "pending" and are completed later via edit.
 */
export async function createCustomerItems(
  clientId: string,
  raw: CustomerItemsBatchInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "operator"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = customerItemsBatchSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }

  const rows = parsed.data.items.map((item) => ({
    client_id:      clientId,
    item_name:      item.item_name.trim(),
    item_date:      sanitize(item.item_date),
    description:    item.deferred ? null : sanitize(item.description),
    drawing_number: item.deferred ? null : sanitize(item.drawing_number),
    quantity:       item.deferred ? null : (item.quantity ?? null),
    uom:            item.deferred ? null : sanitize(item.uom),
    remarks:        sanitize(item.remarks),
    status:         item.deferred ? "pending" : "complete",
    created_by:     user.id,
  }))

  const { error } = await supabase.from("customer_items").insert(rows)
  if (error) return { error: sanitizeError(error) }

  revalidatePath(`/inventory/customers/${clientId}`)
  return {}
}

/** Edit a single item — used both to complete a pending placeholder and to fix a mistake. Admin only. */
export async function updateCustomerItem(
  id: string,
  clientId: string,
  raw: CustomerItemEditInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = customerItemEditSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("customer_items")
    .update({
      item_name:      data.item_name.trim(),
      item_date:      sanitize(data.item_date),
      description:    sanitize(data.description),
      drawing_number: sanitize(data.drawing_number),
      quantity:       data.quantity ?? null,
      uom:            sanitize(data.uom),
      remarks:        sanitize(data.remarks),
      status:         data.status,
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath(`/inventory/customers/${clientId}`)
  return {}
}

/** Move an item to the Recycle Bin (soft delete). Admin only. Nothing is destroyed. */
export async function deleteCustomerItem(id: string, clientId: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const purgeAt = new Date(Date.now() + RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: updated, error } = await supabase
    .from("customer_items")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, purge_at: purgeAt })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")

  if (error) return { error: sanitizeError(error) }
  if (!updated || updated.length === 0) {
    return { error: "Delete was not applied — it may already be in the Recycle Bin." }
  }

  revalidatePath(`/inventory/customers/${clientId}`)
  revalidatePath("/inventory/customers/recycle-bin")
  return {}
}

/** Reverse a soft delete — the item returns exactly as it was. Admin only. */
export async function restoreCustomerItem(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data: updated, error } = await supabase
    .from("customer_items")
    .update({ deleted_at: null, deleted_by: null, purge_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id, client_id")

  if (error) return { error: sanitizeError(error) }
  if (!updated || updated.length === 0) {
    return { error: "Restore was not applied — it may not be in the Recycle Bin." }
  }

  revalidatePath("/inventory/customers/recycle-bin")
  revalidatePath(`/inventory/customers/${(updated[0] as { client_id: string }).client_id}`)
  return {}
}

/** Admin override: purge everything past its retention date right now. */
export async function purgeCustomerItemsNow(): Promise<
  { error?: string; purged?: number; skipped?: { itemName: string; reason: string }[] }
> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { data, error } = await supabase.rpc("purge_expired_customer_items")
  if (error) return { error: sanitizeError(error) }

  const rows = data ?? []
  revalidatePath("/inventory/customers/recycle-bin")
  return {
    purged: rows.filter((r) => !r.skipped).length,
    skipped: rows.filter((r) => r.skipped).map((r) => ({ itemName: r.item_name, reason: r.reason ?? "Blocked" })),
  }
}
