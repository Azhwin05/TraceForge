import { z } from "zod"

export const stockTransferSchema = z.object({
  item_id:          z.string().uuid("Select an item"),
  from_location_id: z.string().uuid("Select the source location"),
  to_location_id:   z.string().uuid("Select the destination location"),
  qty:              z.coerce.number().positive("Quantity must be greater than 0"),
  reason:           z.string().min(1, "A reason is required"),
}).refine((d) => d.from_location_id !== d.to_location_id, {
  message: "Source and destination must be different locations",
  path: ["to_location_id"],
})

export type StockTransferInput = z.infer<typeof stockTransferSchema>
