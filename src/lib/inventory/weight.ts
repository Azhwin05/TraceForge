/**
 * Weight-based consumable measurement (client meeting request #3).
 *
 * Welding wire and powder are consumed from a spool that cannot meaningfully
 * be "returned" part-used, so the shop weighs it before and after instead of
 * declaring a quantity. This converts that weight delta into a stock quantity.
 *
 * Pure and dependency-free on purpose: the result feeds consumed_qty, which the
 * stock ledger treats as fact, so it needs to be testable in isolation.
 */

/**
 * @param beforeKg  weight before the process
 * @param afterKg   weight after the process
 * @param uom       the item's stocking unit
 * @param kgPerUnit nominal kg per stocking unit; null when stocked in kg
 * @returns the quantity used in `uom`, or **null** when the conversion is not
 *          defined. Callers must leave consumed_qty untouched on null — a
 *          fallback of 0 would post a fabricated "nothing used" to the ledger.
 */
export function qtyFromWeights(
  beforeKg: number,
  afterKg: number,
  uom: string,
  kgPerUnit: number | null | undefined,
): number | null {
  if (!Number.isFinite(beforeKg) || !Number.isFinite(afterKg)) return null
  if (afterKg > beforeKg) return null

  const deltaKg = Number((beforeKg - afterKg).toFixed(3))

  // Already stocked in kg — the delta IS the quantity.
  if (uom.trim().toLowerCase() === "kg") return deltaKg

  // Otherwise a declared kg-per-unit on the item master is required.
  if (!kgPerUnit || kgPerUnit <= 0) return null
  return Number((deltaKg / kgPerUnit).toFixed(3))
}
