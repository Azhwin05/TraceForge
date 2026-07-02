/**
 * Runtime environment variable validation.
 * Imported by instrumentation.ts so misconfigured deployments fail fast
 * at startup rather than at request time.
 */

type EnvVar = {
  key: string
  required: boolean
  description: string
}

const ENV_SCHEMA: EnvVar[] = [
  // ── Required ──────────────────────────────────────────────────────────────
  { key: "NEXT_PUBLIC_SUPABASE_URL",      required: true,  description: "Supabase project URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true,  description: "Supabase anon/public key" },
  { key: "NEXT_PUBLIC_APP_URL",           required: true,  description: "App base URL (for CSRF + email links)" },

  // ── Optional but warned if missing in production ──────────────────────────
  { key: "RESEND_API_KEY",    required: false, description: "Resend email API key (email notifications disabled without this)" },
  { key: "SENTRY_DSN",        required: false, description: "Sentry DSN (error tracking disabled without this)" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: false, description: "Service role key (required to provision customer portal logins)" },
  { key: "UPSTASH_REDIS_REST_URL",    required: false, description: "Upstash Redis REST URL (multi-instance rate limiting; falls back to in-process)" },
  { key: "UPSTASH_REDIS_REST_TOKEN",  required: false, description: "Upstash Redis REST token (pairs with UPSTASH_REDIS_REST_URL)" },
]

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production"
  const errors: string[] = []
  const warnings: string[] = []

  for (const { key, required, description } of ENV_SCHEMA) {
    const val = process.env[key]
    if (!val || val.trim() === "") {
      if (required) {
        errors.push(`  ✗ ${key} — ${description}`)
      } else if (isProd) {
        warnings.push(`  ⚠ ${key} — ${description}`)
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `[ValveTrack] Optional env vars not set (some features will be disabled):\n${warnings.join("\n")}`
    )
  }

  if (errors.length > 0) {
    const message =
      `[ValveTrack] FATAL: Required environment variables are missing:\n${errors.join("\n")}\n` +
      `Copy .env.local.example to .env.local and fill in the missing values.`
    throw new Error(message)
  }
}
