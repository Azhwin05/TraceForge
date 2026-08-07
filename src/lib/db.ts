/**
 * Query result helpers for Server Components.
 *
 * The pattern `const { data } = await supabase.from(...)` silently discards the
 * error, so a failed query is indistinguishable from "no rows" — the page
 * renders a confident, empty list. That is how the Portal Users page came to
 * report "No customer portal users yet" while six accounts existed: PostgREST
 * had rejected the query with PGRST201 and nobody was listening.
 *
 * `must()` makes that impossible: the real error is logged server-side with
 * context, and a clean message is thrown for the nearest error.tsx boundary to
 * render. The user gets an honest "couldn't load" instead of a wrong answer.
 */

type QueryResult<T> = { data: T | null; error: unknown }

function describe(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    return JSON.stringify({ code: e.code, message: e.message, details: e.details, hint: e.hint })
  }
  return String(err)
}

/**
 * Unwrap a query that must succeed. Logs the underlying error and throws a
 * short, non-leaky message naming what failed to load.
 *
 * @param label what was being fetched, in user-facing words ("portal users")
 */
export function must<T>(result: QueryResult<T>, label: string): T {
  if (result.error) {
    console.error(`[db] failed to load ${label}:`, describe(result.error))
    throw new Error(`Could not load ${label}.`)
  }
  return result.data as T
}

/**
 * For genuinely optional reads, where an empty result is a valid outcome and
 * the page should still render. Still logs — the failure is recorded rather
 * than swallowed — but returns the fallback instead of throwing.
 */
export function orEmpty<T>(result: QueryResult<T[]>, label: string): T[] {
  if (result.error) {
    console.error(`[db] failed to load ${label} (continuing):`, describe(result.error))
    return []
  }
  return result.data ?? []
}
