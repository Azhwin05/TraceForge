import { must, orEmpty } from "@/lib/db"

/**
 * These guard the fix for the class of bug that hid six portal users: a failed
 * query rendering as an empty list. The critical assertions are that must()
 * THROWS on error (rather than returning null) and that the underlying error is
 * always logged — silently swallowing is the exact failure mode being prevented.
 */

describe("must", () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => errorSpy.mockRestore())

  it("returns the data when the query succeeded", () => {
    expect(must({ data: [{ id: "1" }], error: null }, "widgets")).toEqual([{ id: "1" }])
  })

  it("returns empty arrays untouched — [] is a valid success, not a failure", () => {
    expect(must({ data: [], error: null }, "widgets")).toEqual([])
  })

  it("throws rather than returning null when the query failed", () => {
    expect(() => must({ data: null, error: { message: "boom" } }, "widgets")).toThrow()
  })

  it("names what failed to load, so the boundary can say something useful", () => {
    expect(() => must({ data: null, error: { message: "boom" } }, "portal users"))
      .toThrow(/portal users/)
  })

  it("logs the real PostgREST error server-side", () => {
    // The shape that actually broke: a plain object, not an Error instance.
    const pgErr = { code: "PGRST201", message: "ambiguous embed", details: "two fks", hint: "name it" }
    expect(() => must({ data: null, error: pgErr }, "portal users")).toThrow()

    const logged = errorSpy.mock.calls[0].join(" ")
    expect(logged).toContain("PGRST201")
    expect(logged).toContain("ambiguous embed")
  })

  it("does not leak the raw driver error into the thrown message", () => {
    // The thrown text reaches the browser via the error boundary; internals must not.
    expect(() => must({ data: null, error: { message: "password authentication failed" } }, "widgets"))
      .toThrow(/^Could not load widgets\.$/)
  })

  it("throws even when error is set alongside data — error always wins", () => {
    expect(() => must({ data: [{ id: "1" }], error: { message: "partial" } }, "widgets")).toThrow()
  })

  it("handles a non-object error without crashing the describe() path", () => {
    expect(() => must({ data: null, error: "connection reset" }, "widgets")).toThrow()
    expect(errorSpy.mock.calls[0].join(" ")).toContain("connection reset")
  })
})

describe("orEmpty", () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => errorSpy.mockRestore())

  it("returns the rows on success", () => {
    expect(orEmpty({ data: [{ id: "1" }], error: null }, "grants")).toEqual([{ id: "1" }])
  })

  it("coerces a null payload to an empty array", () => {
    expect(orEmpty({ data: null, error: null }, "grants")).toEqual([])
  })

  it("falls back to [] on error so the page still renders", () => {
    expect(orEmpty({ data: null, error: { message: "boom" } }, "grants")).toEqual([])
  })

  it("still logs on error — degraded, but never silent", () => {
    orEmpty({ data: null, error: { code: "42501", message: "permission denied" } }, "grants")
    expect(errorSpy).toHaveBeenCalled()
    expect(errorSpy.mock.calls[0].join(" ")).toContain("permission denied")
  })
})
