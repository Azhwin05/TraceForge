import type { MachineInput } from "@/lib/validations/machine"
import type { Machine } from "@/types/database"

/** See item-master.ts for why this lives outside any "use client" file. */
export function machineToFormValues(m: Machine): MachineInput {
  return {
    machine_code: m.machine_code,
    name:         m.name,
    category:     m.category,
    location:     m.location ?? undefined,
    notes:        m.notes ?? undefined,
  }
}
