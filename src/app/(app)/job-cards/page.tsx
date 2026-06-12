import { createClient } from "@/lib/supabase/server"
import { JobCardsClient } from "@/components/job-cards/job-cards-client"
import type { JobCardWithRelations, JobCardStatus } from "@/types/database"

export const metadata = { title: "Job Cards — ValveTrack" }
export const revalidate = 60

const VALID_STATUSES: JobCardStatus[] = [
  "created", "wps_pending", "wps_uploaded", "wps_approved",
  "process_assigned", "in_process", "process_complete",
  "reports_pending", "reports_complete", "dispatch_ready",
  "dispatched", "accounts_processing", "closed", "on_hold",
]

export default async function JobCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeStatus = VALID_STATUSES.includes(status as JobCardStatus)
    ? (status as JobCardStatus)
    : null

  const supabase = await createClient()

  // Build query — apply status filter only when one is selected
  let query = supabase
    .from("job_cards")
    .select(
      "id, jc_number, description, status, stage_entered_at, received_date, created_at, client:clients(id, name), creator:profiles!created_by(id, full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(100)

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

  return (
    <JobCardsClient
      jobCards={(data ?? []) as unknown as JobCardWithRelations[]}
      totalCount={count ?? 0}
      activeCount={activeCount ?? 0}
      currentStatus={activeStatus}
    />
  )
}
