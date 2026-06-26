import { rateLimit } from "@/lib/rate-limit"

describe("rateLimit", () => {
  beforeEach(() => {
    // Each test uses a unique key so there's no cross-test state
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`
    const result = rateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("blocks when limit is exceeded", () => {
    const key = `test-block-${Date.now()}`
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000)
    const result = rateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("resets after the window expires", () => {
    const key = `test-reset-${Date.now()}`
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000)
    expect(rateLimit(key, 5, 60_000).allowed).toBe(false)

    // Advance time past window
    jest.advanceTimersByTime(61_000)

    const result = rateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("tracks remaining count accurately", () => {
    const key = `test-remaining-${Date.now()}`
    const r1 = rateLimit(key, 3, 60_000)
    expect(r1.remaining).toBe(2)
    const r2 = rateLimit(key, 3, 60_000)
    expect(r2.remaining).toBe(1)
    const r3 = rateLimit(key, 3, 60_000)
    expect(r3.remaining).toBe(0)
  })

  it("different keys are independent", () => {
    const ts = Date.now()
    const keyA = `test-a-${ts}`
    const keyB = `test-b-${ts}`
    for (let i = 0; i < 5; i++) rateLimit(keyA, 5, 60_000)
    expect(rateLimit(keyA, 5, 60_000).allowed).toBe(false)
    // keyB is untouched
    expect(rateLimit(keyB, 5, 60_000).allowed).toBe(true)
  })
})
