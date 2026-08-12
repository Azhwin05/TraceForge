"use server"

import { requireAuth } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { buildJobCardSearchFilter, MAX_QUERY_LENGTH } from "@/lib/search/job-card-filters"
import type { JobCardWithRelations } from "@/types/database"

const RESULT_LIMIT = 50

export async function searchJobCards(
  query: string
): Promise<{ results: JobCardWithRelations[]; error?: string }> {
  if (!query || query.trim().length < 2) return { results: [] }
  if (query.trim().length > MAX_QUERY_LENGTH) {
    return { results: [], error: "Search query is too long." }
  }

  const session = await requireAuth()
  const { supabase } = session

  // Shared with the Job Cards list so the two can never disagree about what is
  // searchable. See src/lib/search/job-card-filters.ts.
  const filter = await buildJobCardSearchFilter(supabase, query)
  if (!filter) return { results: [] }

  const { data, error } = await supabase
    .from("job_cards")
    .select("id, jc_number, nbdn_number, description, status, received_date, created_at, client:clients(id, name), creator:profiles!created_by(id, full_name)")
    .is("deleted_at", null)
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT)

  if (error) {
    console.error("[searchJobCards]", error)
    return { results: [], error: sanitizeError(error) }
  }

  return { results: (data ?? []) as unknown as JobCardWithRelations[] }
}
