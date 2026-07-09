import { z } from "zod"

const MACHINE_CATEGORIES = ["welding", "machining"] as const

export const machineSchema = z.object({
  machine_code: z.string().min(1, "Machine code is required"),
  name:         z.string().min(1, "Name is required"),
  category:     z.enum(MACHINE_CATEGORIES),
  location:     z.string().nullish(),
  notes:        z.string().nullish(),
})

export type MachineInput = z.infer<typeof machineSchema>
export { MACHINE_CATEGORIES }
