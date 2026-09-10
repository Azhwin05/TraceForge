import { stockTransferSchema } from "@/lib/validations/stock-transfer"

const itemId = "550e8400-e29b-41d4-a716-446655440000"
const locA = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
const locB = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

describe("stockTransferSchema", () => {
  it("accepts a valid transfer between two different locations", () => {
    const r = stockTransferSchema.safeParse({
      item_id: itemId, from_location_id: locA, to_location_id: locB, qty: 5, reason: "consolidating stock",
    })
    expect(r.success).toBe(true)
  })

  it("rejects transferring a location into itself", () => {
    const r = stockTransferSchema.safeParse({
      item_id: itemId, from_location_id: locA, to_location_id: locA, qty: 5, reason: "test",
    })
    expect(r.success).toBe(false)
  })

  it("rejects a non-positive quantity", () => {
    const r = stockTransferSchema.safeParse({
      item_id: itemId, from_location_id: locA, to_location_id: locB, qty: 0, reason: "test",
    })
    expect(r.success).toBe(false)
  })

  it("requires a reason", () => {
    const r = stockTransferSchema.safeParse({
      item_id: itemId, from_location_id: locA, to_location_id: locB, qty: 5, reason: "",
    })
    expect(r.success).toBe(false)
  })
})
