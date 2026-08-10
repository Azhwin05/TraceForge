"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"

type TogglableTable = "consumable_master" | "chemical_master" | "instrument_master" | "machines"

const WRITE_ROLES: Record<TogglableTable, string[]> = {
  consumable_master: ["admin"],
  chemical_master:   ["admin", "qa"],
  instrument_master: ["admin", "qa"],
  machines:          ["admin", "engineer"],
}

const TABLE_PATHS: Record<TogglableTable, string> = {
  consumable_master: "/master-data/consumables",
  chemical_master:   "/master-data/chemicals",
  instrument_master: "/master-data/instruments",
  machines:          "/master-data/machines",
}

export async function toggleMasterItemActive(
  table: TogglableTable,
  id: string,
  currentValue: boolean,
): Promise<{ error?: string }> {
  const roles = WRITE_ROLES[table] as Array<"admin" | "qa" | "engineer" | "operator" | "management" | "accounts">
  const guard = await requireRole(roles)
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from(table)
    .update({ is_active: !currentValue })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  const basePath = TABLE_PATHS[table]
  revalidatePath(basePath)
  revalidatePath(`${basePath}/${id}`)
  return {}
}
