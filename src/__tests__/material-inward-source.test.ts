import { materialInwardSchema } from "@/lib/validations/material-inward"

/**
 * Material can now arrive from a supplier OR from a client sending their own
 * material for a job. The schema is a discriminated union specifically so a
 * mismatched combination (e.g. source_type "customer" with a supplier_id)
 * fails validation before it ever reaches the database's own
 * material_inward_source_matches_type check — two independent guarantees,
 * not one.
 */
const baseItem = { item_id: "550e8400-e29b-41d4-a716-446655440000", dc_quantity: 5, uom: "kg" }
const supplierId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
const clientId = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

function withHeader(header: Record<string, unknown>) {
  return { dc_number: "DC-1", dc_date: "2026-01-01", items: [baseItem], ...header }
}

describe("materialInwardSchema — source_type discriminated union", () => {
  it("accepts a valid supplier source", () => {
    const r = materialInwardSchema.safeParse(withHeader({ source_type: "supplier", supplier_id: supplierId }))
    expect(r.success).toBe(true)
  })

  it("accepts a valid customer source", () => {
    const r = materialInwardSchema.safeParse(withHeader({ source_type: "customer", client_id: clientId }))
    expect(r.success).toBe(true)
  })

  it("rejects supplier source with no supplier_id", () => {
    const r = materialInwardSchema.safeParse(withHeader({ source_type: "supplier" }))
    expect(r.success).toBe(false)
  })

  it("rejects customer source with no client_id", () => {
    const r = materialInwardSchema.safeParse(withHeader({ source_type: "customer" }))
    expect(r.success).toBe(false)
  })

  it("rejects an unrecognised source_type", () => {
    const r = materialInwardSchema.safeParse(withHeader({ source_type: "warehouse", supplier_id: supplierId }))
    expect(r.success).toBe(false)
  })

  it("accepts an optional job_card_id for either source", () => {
    const r = materialInwardSchema.safeParse(
      withHeader({ source_type: "customer", client_id: clientId, job_card_id: "6ba7b812-9dad-11d1-80b4-00c04fd430c8" })
    )
    expect(r.success).toBe(true)
  })

  it("still requires at least one item", () => {
    const r = materialInwardSchema.safeParse({
      dc_number: "DC-1", dc_date: "2026-01-01",
      source_type: "supplier", supplier_id: supplierId, items: [],
    })
    expect(r.success).toBe(false)
  })
})
