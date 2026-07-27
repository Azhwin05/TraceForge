import type { ItemMasterInput } from "@/lib/validations/item-master"
import type { ItemMaster } from "@/types/database"

/**
 * Maps a DB row to edit-form defaults. Deliberately NOT in a "use client"
 * file: Next.js treats every export of a "use client" module as a client
 * reference, so calling a plain helper like this from a Server Component
 * (the edit page) throws at runtime in production builds even though it
 * looks fine in dev — this file exists so both sides can safely import it.
 */
export function itemToFormValues(it: ItemMaster): ItemMasterInput {
  return {
    item_code:        it.item_code,
    item_name:        it.item_name,
    category:         it.category as ItemMasterInput["category"],
    consumable_type:  (it.consumable_type ?? undefined) as ItemMasterInput["consumable_type"],
    uom:              it.uom,
    hsn_code:         it.hsn_code ?? undefined,
    min_stock_level:  it.min_stock_level,
    description:      it.description ?? undefined,
  }
}
