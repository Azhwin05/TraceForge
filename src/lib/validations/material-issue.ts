import { z } from "zod"

export const materialIssueItemSchema = z.object({
  item_id:              z.string().uuid("Select an item"),
  storage_location_id:  z.string().uuid("Select a storage location"),
  issued_qty:           z.coerce.number().positive("Quantity must be greater than 0"),
  uom:                  z.string().min(1, "UOM is required"),
  remarks:              z.string().nullish(),
})

export const materialIssueSchema = z.object({
  job_card_id:  z.string().uuid().nullish().or(z.literal("")),
  issued_to:    z.string().nullish(),
  remarks:      z.string().nullish(),
  items:        z.array(materialIssueItemSchema).min(1, "Add at least one item to issue"),
})

export type MaterialIssueItemInput = z.infer<typeof materialIssueItemSchema>
export type MaterialIssueInput = z.infer<typeof materialIssueSchema>

// Confirmation of how much of each issued line was actually consumed.
export const consumptionSchema = z.object({
  items: z.array(z.object({
    id:           z.string().uuid(),
    consumed_qty: z.coerce.number().min(0, "Cannot be negative"),
  })).min(1),
})

export type ConsumptionInput = z.infer<typeof consumptionSchema>
