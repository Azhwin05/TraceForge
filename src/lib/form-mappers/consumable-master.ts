import type { ConsumableMasterInput } from "@/lib/validations/consumable-master"
import type { ConsumableMaster } from "@/types/database"

/** See item-master.ts for why this lives outside any "use client" file. */
export function consumableToFormValues(c: ConsumableMaster): ConsumableMasterInput {
  return {
    brand:               c.brand,
    product_name:        c.product_name,
    type:                c.type,
    aws_class:           c.aws_class ?? undefined,
    size:                c.size ?? undefined,
    manufacturer:        c.manufacturer ?? undefined,
    notes:               c.notes ?? undefined,
    batch_no:            c.batch_no ?? undefined,
    manufacturing_date:  c.manufacturing_date ?? undefined,
    expiry_date:         c.expiry_date ?? undefined,
  }
}
