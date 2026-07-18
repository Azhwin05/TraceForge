"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createSupplier(raw: SupplierInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = supplierSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

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
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/inventory/suppliers")
  return { id: (row as { id: string }).id }
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
