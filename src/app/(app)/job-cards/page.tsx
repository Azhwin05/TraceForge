import { createClient } from "@/lib/supabase/server"
import { JobCardsClient } from "@/components/job-cards/job-cards-client"
import type { JobCardWithRelations, JobCardStatus } from "@/types/database"

export const metadata = { title: "Job Cards — ValveTrack" }
export const revalidate = 60

const PAGE_SIZE = 25

const VALID_STATUSES: JobCardStatus[] = [
  "created", "wps_pending", "wps_uploaded", "wps_approved",
  "process_assigned", "in_process", "process_complete",
  "reports_pending", "reports_complete", "dispatch_ready",
  "dispatched", "accounts_processing", "closed", "on_hold",
]

export default async function JobCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageParam } = await searchParams

  const activeStatus = VALID_STATUSES.includes(status as JobCardStatus)
    ? (status as JobCardStatus)
    : null

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  let query = supabase
    .from("job_cards")
    .select(
      "id, jc_number, nbdn_number, description, process_type, status, stage_entered_at, received_date, due_date, created_at, client:clients(id, name), creator:profiles!created_by(id, full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (activeStatus) {
    query = query.eq("status", activeStatus)
  }

  const [{ data, count }, { count: activeCount }] = await Promise.all([
    query,
    supabase
      .from("job_cards")
      .select("*", { count: "exact", head: true })
      .neq("status", "closed"),
  ])

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <JobCardsClient
      jobCards={(data ?? []) as unknown as JobCardWithRelations[]}
      totalCount={totalCount}
      activeCount={activeCount ?? 0}
      currentStatus={activeStatus}
      page={page}
      pageSize={PAGE_SIZE}
      totalPages={totalPages}
    />
  )
}
