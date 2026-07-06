// Rate limiter with two backends:
//  • Upstash Redis (via its REST API — no SDK dependency) for multi-instance /
//    serverless deployments, active automatically when UPSTASH_REDIS_REST_URL +
//    UPSTASH_REDIS_REST_TOKEN are set.
//  • In-process sliding window as a fallback for single-instance / local dev.
//
// Use `checkRateLimit` (async) from request paths; `rateLimit` (sync, in-process)
// remains for unit tests and as the local fallback implementation.

type WindowEntry = { count: number; resetAt: number }

const store = new Map<string, WindowEntry>()

// Prune stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key)
  })
}, 5 * 60 * 1000)

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    const entry: WindowEntry = { count: 1, resetAt: now + windowMs }
    store.set(key, entry)
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt }
  }

  existing.count++
  const remaining = Math.max(0, limit - existing.count)
  return {
    allowed: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  }
}

// ── Upstash Redis REST backend (fixed window) ────────────────────────────────
function upstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

type RateResult = { allowed: boolean; remaining: number; resetAt: number }

async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "")
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const headers = { Authorization: `Bearer ${token}` }
  const redisKey = `rl:${key}`

  // INCR the counter; on first hit set the window expiry (PEXPIRE).
  const incrRes = await fetch(`${base}/incr/${encodeURIComponent(redisKey)}`, { headers, cache: "no-store" })
  if (!incrRes.ok) throw new Error(`Upstash INCR failed: ${incrRes.status}`)
  const { result: count } = (await incrRes.json()) as { result: number }

  if (count === 1) {
    await fetch(`${base}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, { headers, cache: "no-store" })
  }

  // Read remaining TTL to compute resetAt (best-effort)
  let resetAt = Date.now() + windowMs
  try {
    const ttlRes = await fetch(`${base}/pttl/${encodeURIComponent(redisKey)}`, { headers, cache: "no-store" })
    if (ttlRes.ok) {
      const { result: pttl } = (await ttlRes.json()) as { result: number }
      if (typeof pttl === "number" && pttl > 0) resetAt = Date.now() + pttl
    }
  } catch { /* non-fatal */ }

  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt }
}

/**
 * Request-path rate limit check. Uses Upstash when configured (correct across
 * multiple instances); otherwise falls back to the in-process limiter. If
 * Upstash errors transiently, fails OPEN to the in-process limiter rather than
 * blocking legitimate traffic.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  if (upstashConfigured()) {
    try {
      return await upstashRateLimit(key, limit, windowMs)
    } catch (e) {
      console.error("[rate-limit] Upstash error, falling back to in-process:", e)
    }
  }
  return rateLimit(key, limit, windowMs)
}
