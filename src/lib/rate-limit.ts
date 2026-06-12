// Simple in-process sliding-window rate limiter.
// Works for single-instance deployments (Docker / VPS).
// For multi-instance, replace with Upstash Redis.

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
