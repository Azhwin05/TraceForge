"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { stockTransferSchema, type StockTransferInput } from "@/lib/validations/stock-transfer"

/**
 * Move existing stock of an item from one storage location to another —
 * client request: "from RE Alapakkam to some other location." Admin only,
 * same boundary as createStockAdjustment.
 *
 * The actual balance change (two stock_ledger rows, atomically, both valued
 * at the source's current weighted average) happens in the database via
 * trg_after_stock_transfer_insert (migration 0060) — this insert is what
 * triggers it, not a second app-level write. That trigger also rejects the
 * transfer outright if the source location doesn't have enough stock; the
 * error surfaces here unmodified through sanitizeError.
 */
export async function createStockTransfer(
  raw: StockTransferInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = stockTransferSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase.from("stock_transfers").insert({
    item_id:          data.item_id,
    from_location_id: data.from_location_id,
    to_location_id:   data.to_location_id,
    qty:              data.qty,
    reason:           data.reason.trim(),
    created_by:       user.id,
  })

  if (error) { console.error("[stock-transfer] create", error); return { error: sanitizeError(error) } }

  revalidatePath("/inventory/stock")
  revalidatePath("/inventory")
  revalidatePath("/inventory/locations")
  // Transfers can now also be started from an item's own detail page (it
  // shows the same per-location balances), which needs its own revalidation
  // or the page would keep showing the pre-transfer quantity after a save.
  revalidatePath(`/inventory/items/${data.item_id}`)
  return {}
}
