"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createSupplier(raw: SupplierInput): Promise<{ error?: string; id?: string; pending?: boolean }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user, role } = guard

  const parsed = supplierSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  // Admins approve on creation; engineers' suppliers wait for admin approval.
  const isAdmin = role === "admin"

  const { data: row, error } = await supabase
    .from("suppliers")
    .insert({
      name:           data.name.trim(),
      contact_name:   sanitize(data.contact_name),
      contact_phone:  sanitize(data.contact_phone),
      contact_email:  sanitize(data.contact_email),
      address:        sanitize(data.address),
      gst_no:         sanitize(data.gst_no),
      is_active:      true,
      approval_status: isAdmin ? "approved" : "pending",
      approved_by:     isAdmin ? user.id : null,
      approved_at:     isAdmin ? new Date().toISOString() : null,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/inventory/suppliers")
  return { id: (row as { id: string }).id, pending: !isAdmin }
}

/** Admin-only: approve or reject a pending supplier. */
export async function setSupplierApproval(
  id: string,
  decision: "approved" | "rejected",
  rejectionReason?: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error } = await supabase
    .from("suppliers")
    .update({
      approval_status:  decision,
      approved_by:      user.id,
      approved_at:      new Date().toISOString(),
      rejection_reason: decision === "rejected" ? sanitize(rejectionReason) : null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/inventory/suppliers")
  return {}
}

export async function updateSupplier(id: string, raw: SupplierInput): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = supplierSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("suppliers")
    .update({
      name:           data.name.trim(),
      contact_name:   sanitize(data.contact_name),
      contact_phone:  sanitize(data.contact_phone),
      contact_email:  sanitize(data.contact_email),
      address:        sanitize(data.address),
      gst_no:         sanitize(data.gst_no),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/inventory/suppliers")
  revalidatePath(`/inventory/suppliers/${id}`)
  return {}
}

/**
 * Permanently delete a supplier. Admin only. Blocked if any material inward
 * (delivery challan) has ever been recorded against them — that FK doesn't
 * cascade, so an in-use supplier can't actually be deleted; this explains why
 * up front instead of surfacing a raw database error.
 */
export async function deleteSupplier(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { count } = await supabase
    .from("material_inward")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", id)

  if ((count ?? 0) > 0) {
    return { error: "Cannot delete: this supplier has material inward history. Deactivate it instead." }
  }

  const { data: deleted, error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) {
    return { error: "Delete was not applied — administrator permission is required." }
  }

  revalidatePath("/inventory/suppliers")
  return {}
}

export async function toggleSupplierActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase.from("suppliers").update({ is_active: isActive }).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/inventory/suppliers")
  return {}
}
