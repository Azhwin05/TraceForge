import { escapeLike, escapeOrFilterValue } from "@/lib/security"

/**
 * Shared search-filter builder for job cards.
 *
 * Exists so the /search page and the Job Cards list cannot drift apart on what
 * is searchable — previously the list's box filtered only the jc_number column
 * of the rows already on screen, so searching a client name found nothing while
 * /search found the job fine.
 */

export const MAX_QUERY_LENGTH = 200

/**
 * Tag matching uses PostgREST array-containment, whose braces are structural in
 * a way quoting does not fully rescue. Rather than risk a malformed filter
 * breaking the entire search, an awkward term just searches the text columns.
 */
const SIMPLE_TERM = /^[a-z0-9 _-]+$/i

/** Columns on job_cards searched with a case-insensitive "contains". */
const TEXT_COLUMNS = [
  "jc_number",
  "nbdn_number",
  "description",
  "po_number",
  "drawing_number",
  "heat_number",
  "part_number",
] as const

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnySupabase = any

/**
 * Whether job_cards.tags exists (migration 0055).
 *
 * Probed once per server process rather than assumed: if the migration has not
 * been applied yet, referencing `tags` in the filter makes PostgREST reject the
 * WHOLE query, so a missing column would break search entirely instead of just
 * omitting tag matching. Cached because the answer cannot change without a
 * deploy-time migration.
 */
let tagsColumnExists: boolean | null = null

async function hasTagsColumn(supabase: AnySupabase): Promise<boolean> {
  if (tagsColumnExists !== null) return tagsColumnExists
  const { error } = await supabase.from("job_cards").select("tags").limit(1)
  tagsColumnExists = !error
  if (error) {
    console.warn(
      "[job-card-search] job_cards.tags not found — tag search disabled. " +
      "Apply migration 0055 to enable it.",
    )
  }
  return tagsColumnExists
}

/**
 * Build the PostgREST `.or()` filter string for a search term.
 *
 * Client name lives on `clients`, so it cannot be OR'd with job_cards columns
 * in one filter — the matching client ids are resolved first and folded in as
 * `client_id.in.(...)`. That costs one extra round trip and keeps the main
 * query a single indexed scan.
 *
 * @returns the filter string for `.or()`, or null when the term is too short
 *          to search (callers should then not filter at all).
 */
export async function buildJobCardSearchFilter(
  supabase: AnySupabase,
  rawTerm: string,
): Promise<string | null> {
  const term = rawTerm.trim()
  if (term.length < 2) return null

  // Two escaping layers: SQL LIKE metacharacters, then PostgREST's own filter
  // syntax. Without the second, any term containing a comma broke the query.
  const safe = escapeOrFilterValue(escapeLike(term))

  const filters: string[] = TEXT_COLUMNS.map((c) => `${c}.ilike."%${safe}%"`)

  const { data: clientMatches, error } = await supabase
    .from("clients")
    .select("id")
    .ilike("name", `%${escapeLike(term)}%`)
    .limit(200)

  if (error) {
    // Not fatal — fall back to job-card columns only, but never silently.
    console.error("[job-card-search] client name lookup failed:", error)
  }

  const clientIds = ((clientMatches ?? []) as { id: string }[]).map((c) => c.id)
  if (clientIds.length > 0) {
    filters.push(`client_id.in.(${clientIds.join(",")})`)
  }

  if (SIMPLE_TERM.test(term) && await hasTagsColumn(supabase)) {
    filters.push(`tags.cs.{"${term.toLowerCase()}"}`)
  }

  return filters.join(",")
}
