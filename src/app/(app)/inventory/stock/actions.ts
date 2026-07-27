"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validations/stock-adjustment"

/**
 * Manual stock correction — "Edit/Delete" for Stock Balances, which is a
 * calculated total rather than an editable row. Increase (found extra stock)
 * or decrease (damaged/lost/count correction), always with a reason. The
 * after_stock_adjustment_insert trigger (0046) validates the decrease against
 * the live balance and appends the matching entry to stock_ledger — nothing
 * is ever mutated, only added, same principle as a receipt or issue.
 */
export async function createStockAdjustment(
  raw: StockAdjustmentInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = stockAdjustmentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase.from("stock_adjustments").insert({
    item_id:             data.item_id,
    storage_location_id: data.storage_location_id,
    direction:           data.direction,
    qty:                 data.qty,
    unit_rate:           data.unit_rate ?? 0,
    reason:              data.reason.trim(),
    created_by:          user.id,
  })

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/inventory/stock")
  revalidatePath("/inventory")
  return {}
}
