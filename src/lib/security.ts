/**
 * Enterprise security utilities.
 * Central home for UUID validation, error sanitization, HTML escaping,
 * and CSRF origin checking. Import from here — never inline these patterns.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Returns true only for valid RFC-4122 UUIDs. */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

/**
 * Strips internal Supabase/Postgres error details from messages returned to
 * the client. Log the original server-side before calling this.
 */
/**
 * Pulls a human-readable message out of whatever an error-ish value turns out
 * to be. Supabase/PostgREST errors are PLAIN OBJECTS ({ message, details, hint,
 * code }), not Error instances — so `String(err)` on them yields the literal
 * "[object Object]". That was doing two bad things at once: showing users a
 * meaningless toast, and silently defeating the leak filter below (its patterns
 * can never match "[object Object]", so nothing was ever actually filtered).
 */
function extractMessage(err: unknown): string {
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
  }
  return ""
}

export function sanitizeError(err: unknown): string {
  if (!err) return "An unexpected error occurred."

  const msg = extractMessage(err)
  if (!msg.trim()) return "An unexpected error occurred."

  // Block patterns that leak schema/constraint details
  const leaks = [
    /duplicate key value/i,
    /violates foreign key/i,
    /violates not-null/i,
    /violates check constraint/i,
    /column .+ of relation/i,
    /relation ".+" does not exist/i,
    /permission denied/i,
    /syntax error/i,
    /invalid input syntax/i,
    /ERROR:\s/i,
  ]

  if (leaks.some((re) => re.test(msg))) {
    return "A database error occurred. Please try again or contact support."
  }

  // Safe to surface
  return msg.length < 200 ? msg : "An unexpected error occurred."
}

/** Escape user-supplied strings before embedding in HTML (e.g. email bodies). */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Validate that a POST/PUT/DELETE request's Origin header matches the
 * application's own host (CSRF mitigation for API routes).
 *
 * Pass `request.headers` and `process.env.NEXT_PUBLIC_APP_URL`.
 * Returns true when the origin is valid or the method is safe (GET/HEAD).
 */
export function isValidOrigin(
  headers: Headers,
  method: string,
  appUrl: string,
): boolean {
  const safeMethods = ["GET", "HEAD", "OPTIONS"]
  if (safeMethods.includes(method.toUpperCase())) return true

  const origin = headers.get("origin")
  const referer = headers.get("referer")

  let expectedHost: string
  try {
    expectedHost = new URL(appUrl).host
  } catch {
    // If APP_URL is misconfigured, fail open in dev, closed in prod
    return process.env.NODE_ENV !== "production"
  }

  const candidate = origin ?? referer
  if (!candidate) {
    // No origin/referer → same-origin browser form or server-to-server; allow
    return true
  }

  try {
    const candidateHost = new URL(candidate).host
    return candidateHost === expectedHost
  } catch {
    return false
  }
}

/** Escape % and _ wildcards in ILIKE/LIKE patterns so users can't inject wildcards. */
export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}
