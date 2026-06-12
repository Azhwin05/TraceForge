"use server"

import { requireAuth } from "@/lib/auth"
import type { JobCardWithRelations } from "@/types/database"

export async function searchJobCards(
  query: string
): Promise<{ results: JobCardWithRelations[]; error?: string }> {
  if (!query || query.trim().length < 2) return { results: [] }

  const session = await requireAuth()
  const { supabase } = session
  const q = query.trim()

  // Use Postgres ILIKE via .or() — indexed by pg_trgm on description and jc_number
  const { data, error } = await supabase
    .from("job_cards")
    .select("id, jc_number, nbdn_number, description, status, received_date, created_at, client:clients(id, name), creator:profiles!created_by(id, full_name)")
    .or(
      [
        `jc_number.ilike.%${q}%`,
        `nbdn_number.ilike.%${q}%`,
        `description.ilike.%${q}%`,
        `po_number.ilike.%${q}%`,
        `drawing_number.ilike.%${q}%`,
        `heat_number.ilike.%${q}%`,
        `part_number.ilike.%${q}%`,
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return { results: [], error: error.message }
  return { results: (data ?? []) as unknown as JobCardWithRelations[] }
}
