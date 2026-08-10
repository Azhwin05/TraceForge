"use server"

import { requireAuth } from "@/lib/auth"
import { escapeLike, escapeOrFilterValue, sanitizeError } from "@/lib/security"
import type { JobCardWithRelations } from "@/types/database"

const MAX_QUERY_LENGTH = 200
const RESULT_LIMIT = 50

/**
 * A tag clause is only added for "simple" terms. Tag matching uses PostgREST's
 * array-containment syntax, whose braces are structural in a way that quoting
 * does not fully rescue — so rather than risk a malformed filter breaking the
 * whole search, an awkward term just searches the text columns instead.
 */
const SIMPLE_TERM = /^[a-z0-9 _-]+$/i

export async function searchJobCards(
  query: string
): Promise<{ results: JobCardWithRelations[]; error?: string }> {
  if (!query || query.trim().length < 2) return { results: [] }
  if (query.trim().length > MAX_QUERY_LENGTH) {
    return { results: [], error: "Search query is too long." }
  }

  const session = await requireAuth()
  const { supabase } = session

  const term = query.trim()
  // Two escaping layers: LIKE metacharacters, then PostgREST's own filter
  // syntax. See escapeOrFilterValue — without the second one, any term
  // containing a comma failed the entire query.
  const safe = escapeOrFilterValue(escapeLike(term))

  // Client name lives on `clients`, so it cannot be OR'd with job_cards
  // columns in a single filter. Resolving the ids first keeps this to one
  // extra round trip and leaves the main query as a single indexed scan.
  // (Client name was the one field the client explicitly asked for that the
  // search genuinely did not cover.)
  const { data: clientMatches, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .ilike("name", `%${escapeLike(term)}%`)
    .limit(100)

  if (clientError) {
    // Not fatal — fall back to searching job-card columns only, but record it.
    console.error("[searchJobCards] client name lookup failed:", clientError)
  }
  const clientIds = (clientMatches ?? []).map((c) => c.id)

  const filters = [
    `jc_number.ilike."%${safe}%"`,
    `nbdn_number.ilike."%${safe}%"`,
    `description.ilike."%${safe}%"`,
    `po_number.ilike."%${safe}%"`,
    `drawing_number.ilike."%${safe}%"`,
    `heat_number.ilike."%${safe}%"`,
    `part_number.ilike."%${safe}%"`,
  ]

  if (clientIds.length > 0) {
    filters.push(`client_id.in.(${clientIds.join(",")})`)
  }
  if (SIMPLE_TERM.test(term)) {
    filters.push(`tags.cs.{"${term.toLowerCase()}"}`)
  }

  const { data, error } = await supabase
    .from("job_cards")
    .select("id, jc_number, nbdn_number, description, status, received_date, created_at, tags, client:clients(id, name), creator:profiles!created_by(id, full_name)")
    .is("deleted_at", null)
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT)

  if (error) {
    console.error("[searchJobCards]", error)
    return { results: [], error: sanitizeError(error) }
  }

  return { results: (data ?? []) as unknown as JobCardWithRelations[] }
}
