"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { instrumentMasterSchema, type InstrumentMasterInput } from "@/lib/validations/instrument-master"
import { sanitizeError } from "@/lib/security"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

export async function createInstrumentMaster(
  raw: InstrumentMasterInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = instrumentMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: row, error } = await supabase
    .from("instrument_master")
    .insert({
      instrument_name: data.instrument_name.trim(),
      instrument_type: data.instrument_type,
      serial_number:   sanitize(data.serial_number),
      manufacturer:    sanitize(data.manufacturer),
      calibration_due: data.calibration_due || null,
      is_active:       true,
    })
    .select("id")
    .single()

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/master-data/instruments")
  return { id: (row as { id: string }).id }
}

export async function updateInstrumentMaster(
  id: string,
  raw: InstrumentMasterInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = instrumentMasterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("instrument_master")
    .update({
      instrument_name: data.instrument_name.trim(),
      instrument_type: data.instrument_type,
      serial_number:   sanitize(data.serial_number),
      manufacturer:    sanitize(data.manufacturer),
      calibration_due: data.calibration_due || null,
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/master-data/instruments")
  revalidatePath(`/master-data/instruments/${id}`)
  return {}
}
