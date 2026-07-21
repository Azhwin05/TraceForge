import { z } from "zod"

const ITEM_CATEGORIES = ["raw_material", "consumable", "component", "finished_part", "other"] as const
const CONSUMABLE_TYPES = ["powder", "rod", "wire", "other"] as const

export const itemMasterSchema = z.object({
  item_code:        z.string().min(1, "Item code is required"),
  item_name:        z.string().min(1, "Item name is required"),
  category:         z.enum(ITEM_CATEGORIES),
  consumable_type:  z.enum(CONSUMABLE_TYPES).nullish(),
  uom:              z.string().min(1, "Unit of measure is required"),
  hsn_code:         z.string().nullish(),
  min_stock_level:  z.coerce.number().min(0).default(0),
  description:      z.string().nullish(),
}).refine(
  (d) => d.category !== "consumable" || !!d.consumable_type,
  { message: "Consumable type is required for consumables", path: ["consumable_type"] },
)

export type ItemMasterInput = z.infer<typeof itemMasterSchema>
export { ITEM_CATEGORIES, CONSUMABLE_TYPES }
