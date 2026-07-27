"use server"

import { requireAuth } from "@/lib/auth"
import { escapeLike, sanitizeError } from "@/lib/security"
import type { JobCardWithRelations } from "@/types/database"

const MAX_QUERY_LENGTH = 200

export async function searchJobCards(
  query: string
): Promise<{ results: JobCardWithRelations[]; error?: string }> {
  if (!query || query.trim().length < 2) return { results: [] }
  if (query.trim().length > MAX_QUERY_LENGTH) {
    return { results: [], error: "Search query is too long." }
  }

  const session = await requireAuth()
  const { supabase } = session

  // Escape LIKE metacharacters so users can't inject wildcard patterns
  const safe = escapeLike(query.trim())

  const { data, error } = await supabase
    .from("job_cards")
    .select("id, jc_number, nbdn_number, description, status, received_date, created_at, client:clients(id, name), creator:profiles!created_by(id, full_name)")
    .is("deleted_at", null)
    .or(
      [
        `jc_number.ilike.%${safe}%`,
        `nbdn_number.ilike.%${safe}%`,
        `description.ilike.%${safe}%`,
        `po_number.ilike.%${safe}%`,
        `drawing_number.ilike.%${safe}%`,
        `heat_number.ilike.%${safe}%`,
        `part_number.ilike.%${safe}%`,
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[searchJobCards]", error)
    return { results: [], error: sanitizeError(error) }
  }

  return { results: (data ?? []) as unknown as JobCardWithRelations[] }
}
