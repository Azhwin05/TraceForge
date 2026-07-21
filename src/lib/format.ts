// Shared display formatters.

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

/** ₹ with Indian lakh/crore grouping, e.g. 100000 → "₹1,00,000.00". */
export function formatInr(value: number | null | undefined): string {
  return INR.format(Number(value) || 0)
}

const QTY = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 })

/** Quantity with up to 3 decimals and Indian grouping. */
export function formatQty(value: number | null | undefined): string {
  return QTY.format(Number(value) || 0)
}
