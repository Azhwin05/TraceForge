import { createJobCardSchema, createClientSchema } from "@/lib/validations/job-card"

describe("createJobCardSchema", () => {
  const validInput = {
    client_id: "550e8400-e29b-41d4-a716-446655440000",
    nbdn_number: "NBDN-2024-001",
    description: "Valve repair job",
    quantity: 5,
    process_type: ["welding"],
    received_date: "2024-01-15",
  }

  it("accepts valid input", () => {
    const result = createJobCardSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("rejects missing client_id", () => {
    const result = createJobCardSchema.safeParse({ ...validInput, client_id: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty process_type array", () => {
    const result = createJobCardSchema.safeParse({ ...validInput, process_type: [] })
    expect(result.success).toBe(false)
  })

  it("rejects invalid process type value", () => {
    const result = createJobCardSchema.safeParse({ ...validInput, process_type: ["hacking"] })
    expect(result.success).toBe(false)
  })

  it("rejects quantity below 1", () => {
    const result = createJobCardSchema.safeParse({ ...validInput, quantity: 0 })
    expect(result.success).toBe(false)
  })

  it("accepts multiple process types", () => {
    const result = createJobCardSchema.safeParse({ ...validInput, process_type: ["welding", "machining"] })
    expect(result.success).toBe(true)
  })
})

describe("createClientSchema", () => {
  it("accepts valid minimal client", () => {
    const result = createClientSchema.safeParse({ name: "Raghav Engineering" })
    expect(result.success).toBe(true)
  })

  it("rejects empty client name", () => {
    const result = createClientSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email format", () => {
    const result = createClientSchema.safeParse({ name: "Client", contact_email: "not-an-email" })
    expect(result.success).toBe(false)
  })

  it("accepts empty string email (field is optional)", () => {
    const result = createClientSchema.safeParse({ name: "Client", contact_email: "" })
    expect(result.success).toBe(true)
  })

  it("accepts valid email", () => {
    const result = createClientSchema.safeParse({ name: "Client", contact_email: "contact@example.com" })
    expect(result.success).toBe(true)
  })
})
