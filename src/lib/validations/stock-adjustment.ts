import { z } from "zod"

export const stockAdjustmentSchema = z.object({
  item_id:             z.string().uuid("Select an item"),
  storage_location_id: z.string().uuid("Select a storage location"),
  direction:           z.enum(["in", "out"]),
  qty:                 z.coerce.number().positive("Quantity must be greater than 0"),
  // Only meaningful for "in" — the trigger defaults to the current weighted
  // average when this is left blank, and always overrides it for "out".
  unit_rate:           z.coerce.number().min(0).nullish(),
  reason:              z.string().min(1, "A reason is required"),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
