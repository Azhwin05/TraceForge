import { validateEnv } from "@/lib/env"

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
]

describe("validateEnv", () => {
  const original = { ...process.env }

  afterEach(() => {
    // Restore original env
    for (const key of REQUIRED_VARS) {
      if (original[key] !== undefined) {
        process.env[key] = original[key]
      } else {
        delete process.env[key]
      }
    }
  })

  it("passes when all required vars are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiJ9.test"
    process.env.NEXT_PUBLIC_APP_URL = "https://valvetrack.in"
    expect(() => validateEnv()).not.toThrow()
  })

  it("throws when SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiJ9.test"
    process.env.NEXT_PUBLIC_APP_URL = "https://valvetrack.in"
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it("throws when APP_URL is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiJ9.test"
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_APP_URL/)
  })

  it("error message mentions all missing vars", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})
