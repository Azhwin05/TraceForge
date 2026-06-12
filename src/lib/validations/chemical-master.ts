import { z } from "zod"

const CHEMICAL_TYPES = ["penetrant", "developer", "cleaner", "remover", "other"] as const

export const chemicalMasterSchema = z.object({
  chemical_name: z.string().min(1, "Chemical name is required"),
  type:          z.enum(CHEMICAL_TYPES),
  manufacturer:  z.string().nullish(),
  notes:         z.string().nullish(),
  batch_no:      z.string().nullish(),
  expiry_date:   z.string().nullish(), // ISO date string
})

export type ChemicalMasterInput = z.infer<typeof chemicalMasterSchema>
export { CHEMICAL_TYPES }
