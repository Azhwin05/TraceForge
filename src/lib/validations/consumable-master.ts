import { z } from "zod"

const CONSUMABLE_TYPES = ["electrode", "wire", "flux", "rod", "other"] as const

export const consumableMasterSchema = z.object({
  brand:               z.string().min(1, "Brand is required"),
  product_name:        z.string().min(1, "Product name is required"),
  type:                z.enum(CONSUMABLE_TYPES),
  aws_class:           z.string().nullish(),
  size:                z.string().nullish(),
  manufacturer:        z.string().nullish(),
  notes:               z.string().nullish(),
  batch_no:            z.string().nullish(),
  manufacturing_date:  z.string().nullish(), // ISO date string
  expiry_date:         z.string().nullish(), // ISO date string
})

export type ConsumableMasterInput = z.infer<typeof consumableMasterSchema>
export { CONSUMABLE_TYPES }
