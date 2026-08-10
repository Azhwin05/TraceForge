"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { chemicalMasterSchema, type ChemicalMasterInput } from "@/lib/validations/chemical-master"
import { sanitizeError } from "@/lib/security"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createChemicalMaster(
  raw: ChemicalMasterInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = chemicalMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("chemical_master")
    .insert({
      chemical_name: data.chemical_name.trim(),
      type:          data.type,
      manufacturer:  sanitize(data.manufacturer),
      notes:         sanitize(data.notes),
      batch_no:      sanitize(data.batch_no),
      expiry_date:   data.expiry_date || null,
      is_active:     true,
    })
    .select("id")
    .single()

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/master-data/chemicals")
  return { id: (row as { id: string }).id }
}

export async function updateChemicalMaster(
  id: string,
  raw: ChemicalMasterInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = chemicalMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("chemical_master")
    .update({
      chemical_name: data.chemical_name.trim(),
      type:          data.type,
      manufacturer:  sanitize(data.manufacturer),
      notes:         sanitize(data.notes),
      batch_no:      sanitize(data.batch_no),
      expiry_date:   data.expiry_date || null,
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/master-data/chemicals")
  revalidatePath(`/master-data/chemicals/${id}`)
  return {}
}
