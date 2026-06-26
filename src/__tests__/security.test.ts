import { isValidUUID, sanitizeError, escapeHtml, escapeLike, isValidOrigin } from "@/lib/security"

describe("isValidUUID", () => {
  it("accepts valid v4 UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
    expect(isValidUUID("a3bb189e-8bf9-3888-9912-ace4e6543002")).toBe(true)
  })

  it("rejects non-UUID strings", () => {
    expect(isValidUUID("")).toBe(false)
    expect(isValidUUID("not-a-uuid")).toBe(false)
    expect(isValidUUID("../../etc/passwd")).toBe(false)
    expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false) // missing hyphens
    expect(isValidUUID("550e8400-e29b-41d4-a716-44665544000Z")).toBe(false) // non-hex char
  })

  it("rejects SQL injection strings", () => {
    expect(isValidUUID("1' OR '1'='1")).toBe(false)
    expect(isValidUUID("'; DROP TABLE users; --")).toBe(false)
  })
})

describe("sanitizeError", () => {
  it("returns a safe message for Postgres constraint errors", () => {
    const msg = sanitizeError(new Error('duplicate key value violates unique constraint "job_cards_jc_number_key"'))
    expect(msg).not.toContain("job_cards")
    expect(msg).not.toContain("duplicate key")
    expect(msg).toContain("database error")
  })

  it("returns safe message for foreign key errors", () => {
    const msg = sanitizeError(new Error('violates foreign key constraint "profiles_id_fkey"'))
    expect(msg).toContain("database error")
  })

  it("passes through safe, short, human-readable messages", () => {
    const safe = "Only draft reports can be approved."
    expect(sanitizeError(new Error(safe))).toBe(safe)
  })

  it("handles null/undefined gracefully", () => {
    expect(sanitizeError(null)).toBe("An unexpected error occurred.")
    expect(sanitizeError(undefined)).toBe("An unexpected error occurred.")
  })

  it("truncates very long messages", () => {
    const longMsg = "a".repeat(300)
    const result = sanitizeError(new Error(longMsg))
    expect(result).not.toBe(longMsg)
  })
})

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    )
  })

  it("escapes ampersands", () => {
    expect(escapeHtml("R&D Department")).toBe("R&amp;D Department")
  })

  it("escapes single quotes", () => {
    expect(escapeHtml("O'Brien")).toBe("O&#39;Brien")
  })

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Raghav Engineering Pvt Ltd")).toBe("Raghav Engineering Pvt Ltd")
  })
})

describe("escapeLike", () => {
  it("escapes percent wildcards", () => {
    expect(escapeLike("100%")).toBe("100\\%")
  })

  it("escapes underscore wildcards", () => {
    expect(escapeLike("JC_001")).toBe("JC\\_001")
  })

  it("escapes backslashes first to avoid double-escaping", () => {
    expect(escapeLike("C:\\path")).toBe("C:\\\\path")
  })

  it("leaves normal search terms unchanged", () => {
    expect(escapeLike("valve repair")).toBe("valve repair")
  })
})

describe("isValidOrigin", () => {
  const appUrl = "https://valvetrack.in"

  it("allows GET requests regardless of origin", () => {
    const headers = new Headers({ origin: "https://evil.com" })
    expect(isValidOrigin(headers, "GET", appUrl)).toBe(true)
  })

  it("allows POST from matching origin", () => {
    const headers = new Headers({ origin: "https://valvetrack.in" })
    expect(isValidOrigin(headers, "POST", appUrl)).toBe(true)
  })

  it("blocks POST from foreign origin", () => {
    const headers = new Headers({ origin: "https://evil.com" })
    expect(isValidOrigin(headers, "POST", appUrl)).toBe(false)
  })

  it("allows POST with no origin header (same-origin form)", () => {
    const headers = new Headers()
    expect(isValidOrigin(headers, "POST", appUrl)).toBe(true)
  })

  it("uses Referer as fallback when Origin is absent", () => {
    const headers = new Headers({ referer: "https://evil.com/attack" })
    expect(isValidOrigin(headers, "POST", appUrl)).toBe(false)
  })
})
