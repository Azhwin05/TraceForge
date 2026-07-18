import { z } from "zod"

export const supplierSchema = z.object({
  name:           z.string().min(1, "Supplier name is required"),
  contact_name:   z.string().nullish(),
  contact_phone:  z.string().nullish(),
  contact_email:  z.string().email("Invalid email").nullish().or(z.literal("")),
  address:        z.string().nullish(),
  gst_no:         z.string().nullish(),
})

export type SupplierInput = z.infer<typeof supplierSchema>
