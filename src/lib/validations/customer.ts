import { z } from "zod"

export const customerSchema = z.object({
  name:          z.string().min(1, "Customer name is required"),
  contact_name:  z.string().nullish(),
  contact_email: z.string().email("Invalid email").nullish().or(z.literal("")),
  contact_phone: z.string().nullish(),
  address:       z.string().nullish(),
})

export type CustomerInput = z.infer<typeof customerSchema>

// A single row in the batch "Add Items" form. When `deferred` is checked,
// only item_name is required — everything else can be filled in later via
// edit, and the row is saved with status: "pending" instead of "complete".
export const customerItemRowSchema = z.object({
  item_name:      z.string().min(1, "Item name is required"),
  description:    z.string().nullish(),
  drawing_number: z.string().nullish(),
  quantity:       z.coerce.number().nullish(),
  uom:            z.string().nullish(),
  remarks:        z.string().nullish(),
  deferred:       z.boolean().default(false),
})

export type CustomerItemRowInput = z.infer<typeof customerItemRowSchema>

export const customerItemsBatchSchema = z.object({
  items: z.array(customerItemRowSchema).min(1, "Add at least one item"),
})

export type CustomerItemsBatchInput = z.infer<typeof customerItemsBatchSchema>

export function blankCustomerItemRow(): CustomerItemRowInput {
  return { item_name: "", description: "", drawing_number: "", quantity: undefined, uom: "", remarks: "", deferred: false }
}

// Editing a single existing item (completing a pending one, or fixing a mistake).
export const customerItemEditSchema = z.object({
  item_name:      z.string().min(1, "Item name is required"),
  description:    z.string().nullish(),
  drawing_number: z.string().nullish(),
  quantity:       z.coerce.number().nullish(),
  uom:            z.string().nullish(),
  remarks:        z.string().nullish(),
  status:         z.enum(["pending", "complete"]),
})

export type CustomerItemEditInput = z.infer<typeof customerItemEditSchema>
