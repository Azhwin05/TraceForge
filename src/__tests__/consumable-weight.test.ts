import { qtyFromWeights } from "@/lib/inventory/weight"

/**
 * This conversion feeds consumed_qty, which the stock ledger treats as fact.
 * A wrong factor silently corrupts inventory valuation, so the important cases
 * here are the ones where the function must REFUSE to answer rather than guess.
 */
describe("qtyFromWeights", () => {
  it("uses the weight delta directly when the item is stocked in kg", () => {
    expect(qtyFromWeights(20, 12.5, "kg", null)).toBe(7.5)
  })

  it("is case- and whitespace-insensitive about the kg unit", () => {
    expect(qtyFromWeights(20, 12.5, " KG ", null)).toBe(7.5)
  })

  it("converts via kg_per_unit when stock is held in another unit", () => {
    // A 15 kg coil: 30 kg consumed is 2 coils.
    expect(qtyFromWeights(45, 15, "coil", 15)).toBe(2)
  })

  it("rounds to three decimals, matching the numeric(14,3) columns", () => {
    expect(qtyFromWeights(10, 6.6667, "kg", null)).toBe(3.333)
  })

  it("returns null — not 0 — when the conversion factor is missing", () => {
    // The caller must leave consumed_qty alone here. Returning 0 would post a
    // fabricated "nothing was used" to the ledger.
    expect(qtyFromWeights(45, 15, "coil", null)).toBeNull()
    expect(qtyFromWeights(45, 15, "coil", undefined)).toBeNull()
    expect(qtyFromWeights(45, 15, "nos", 0)).toBeNull()
  })

  it("refuses a negative conversion factor", () => {
    expect(qtyFromWeights(45, 15, "coil", -15)).toBeNull()
  })

  it("returns null when the item gained weight — that is a data-entry error", () => {
    expect(qtyFromWeights(10, 12, "kg", null)).toBeNull()
  })

  it("returns zero when nothing was used", () => {
    expect(qtyFromWeights(20, 20, "kg", null)).toBe(0)
  })

  it("returns null for non-finite input rather than NaN", () => {
    expect(qtyFromWeights(NaN, 5, "kg", null)).toBeNull()
    expect(qtyFromWeights(10, NaN, "kg", null)).toBeNull()
    expect(qtyFromWeights(Infinity, 5, "kg", null)).toBeNull()
  })
})
