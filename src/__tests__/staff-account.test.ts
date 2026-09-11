import {
  createStaffUserSchema,
  changeOwnPasswordSchema,
  changeOwnEmailSchema,
  emailSchema,
  STAFF_ROLES,
} from "@/lib/validations/staff-account"

describe("createStaffUserSchema", () => {
  const base = {
    email: "priya@raghaveng.com",
    password: "Test@1234",
    fullName: "Priya Sharma",
    role: "operator",
  }

  it("accepts a valid staff account", () => {
    expect(createStaffUserSchema.safeParse(base).success).toBe(true)
  })

  it("lower-cases and trims the email", () => {
    const r = createStaffUserSchema.safeParse({ ...base, email: "  Priya@RaghavEng.com  " })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe("priya@raghaveng.com")
  })

  it("rejects an invalid email", () => {
    expect(createStaffUserSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false)
  })

  it("rejects a password under 8 characters", () => {
    expect(createStaffUserSchema.safeParse({ ...base, password: "short1" }).success).toBe(false)
  })

  it("rejects a blank full name", () => {
    expect(createStaffUserSchema.safeParse({ ...base, fullName: "" }).success).toBe(false)
  })

  it("rejects 'customer' as a role — that account type is provisioned from Portal Users only", () => {
    expect(createStaffUserSchema.safeParse({ ...base, role: "customer" }).success).toBe(false)
  })

  it("rejects an unknown role", () => {
    expect(createStaffUserSchema.safeParse({ ...base, role: "superuser" }).success).toBe(false)
  })

  it("accepts every role STAFF_ROLES lists", () => {
    for (const role of STAFF_ROLES) {
      expect(createStaffUserSchema.safeParse({ ...base, role }).success).toBe(true)
    }
  })
})

describe("changeOwnPasswordSchema", () => {
  it("accepts a valid change", () => {
    const r = changeOwnPasswordSchema.safeParse({
      currentPassword: "OldPass123",
      newPassword: "NewPass456",
    })
    expect(r.success).toBe(true)
  })

  it("rejects a new password under 8 characters", () => {
    const r = changeOwnPasswordSchema.safeParse({
      currentPassword: "OldPass123",
      newPassword: "short1",
    })
    expect(r.success).toBe(false)
  })

  it("rejects when the new password matches the current one", () => {
    const r = changeOwnPasswordSchema.safeParse({
      currentPassword: "SamePass123",
      newPassword: "SamePass123",
    })
    expect(r.success).toBe(false)
  })

  it("requires a current password", () => {
    const r = changeOwnPasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "NewPass456",
    })
    expect(r.success).toBe(false)
  })
})

describe("changeOwnEmailSchema", () => {
  it("accepts a valid change", () => {
    const r = changeOwnEmailSchema.safeParse({
      currentPassword: "MyPassword1",
      newEmail: "new@raghaveng.com",
    })
    expect(r.success).toBe(true)
  })

  it("rejects an invalid new email", () => {
    const r = changeOwnEmailSchema.safeParse({
      currentPassword: "MyPassword1",
      newEmail: "not-an-email",
    })
    expect(r.success).toBe(false)
  })

  it("requires a current password", () => {
    const r = changeOwnEmailSchema.safeParse({
      currentPassword: "",
      newEmail: "new@raghaveng.com",
    })
    expect(r.success).toBe(false)
  })
})

describe("emailSchema", () => {
  it("normalizes case and whitespace", () => {
    const r = emailSchema.safeParse("  ADMIN@RaghavEng.com ")
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe("admin@raghaveng.com")
  })
})
