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
  remarks:      z.string().nullish(),
  items:        z.array(materialIssueItemSchema).min(1, "Add at least one item to issue"),
})

export type MaterialIssueItemInput = z.infer<typeof materialIssueItemSchema>
export type MaterialIssueInput = z.infer<typeof materialIssueSchema>
