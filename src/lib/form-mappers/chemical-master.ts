import type { ChemicalMasterInput } from "@/lib/validations/chemical-master"
import type { ChemicalMaster } from "@/types/database"

/** See item-master.ts for why this lives outside any "use client" file. */
export function chemicalToFormValues(c: ChemicalMaster): ChemicalMasterInput {
  return {
    chemical_name: c.chemical_name,
    type:          c.type,
    manufacturer:  c.manufacturer ?? undefined,
    notes:         c.notes ?? undefined,
    batch_no:      c.batch_no ?? undefined,
    expiry_date:   c.expiry_date ?? undefined,
  }
}
