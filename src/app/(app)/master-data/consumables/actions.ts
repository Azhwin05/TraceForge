"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { consumableMasterSchema, type ConsumableMasterInput } from "@/lib/validations/consumable-master"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createConsumableMaster(
  raw: ConsumableMasterInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = consumableMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("consumable_master")
    .insert({
      brand:               data.brand.trim(),
      product_name:        data.product_name.trim(),
      type:                data.type,
      aws_class:           sanitize(data.aws_class),
      size:                sanitize(data.size),
      manufacturer:        sanitize(data.manufacturer),
      notes:               sanitize(data.notes),
      batch_no:            sanitize(data.batch_no),
      manufacturing_date:  data.manufacturing_date || null,
      expiry_date:         data.expiry_date || null,
      is_active:           true,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/master-data/consumables")
  return { id: (row as { id: string }).id }
}

export async function updateConsumableMaster(
  id: string,
  raw: ConsumableMasterInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = consumableMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("consumable_master")
    .update({
      brand:               data.brand.trim(),
      product_name:        data.product_name.trim(),
      type:                data.type,
      aws_class:           sanitize(data.aws_class),
      size:                sanitize(data.size),
      manufacturer:        sanitize(data.manufacturer),
      notes:               sanitize(data.notes),
      batch_no:            sanitize(data.batch_no),
      manufacturing_date:  data.manufacturing_date || null,
      expiry_date:         data.expiry_date || null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/master-data/consumables")
  revalidatePath(`/master-data/consumables/${id}`)
  return {}
}
