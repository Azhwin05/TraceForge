import { requireAuth } from "@/lib/auth"
import { PwhtRunsClient } from "@/components/pwht/pwht-runs-client"
import type { PwhtRun, PwhtJobStatus, JobCard, UserRole } from "@/types/database"

export const metadata = { title: "PWHT Runs — ValveTrack" }
export const revalidate = 60

const PAGE_SIZE = 20

type RunJob = { id: string; job_card_id: string; status: PwhtJobStatus; job_cards: { jc_number: string; description: string } | null }
type PwhtRunWithJobs = PwhtRun & { pwht_run_jobs: RunJob[] }
type EligibleJC = JobCard & { clients: { name: string } | null }

export default async function PwhtRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, profile } = await requireAuth()
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const offset = (page - 1) * PAGE_SIZE

  const [{ data: runs, count }, { data: jobCards }] = await Promise.all([
    supabase
      .from("pwht_runs")
      .select("*, pwht_run_jobs(id, job_card_id, status, job_cards(jc_number, description))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("job_cards")
      .select("*, clients(name)")
      .not("status", "in", '("closed","dispatched","accounts_processing")')
      .order("jc_number"),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <PwhtRunsClient
      runs={(runs ?? []) as unknown as PwhtRunWithJobs[]}
      eligibleJobCards={(jobCards ?? []) as unknown as EligibleJC[]}
      page={page}
      totalPages={totalPages}
      totalCount={count ?? 0}
      userRole={(profile?.role ?? "operator") as UserRole}
    />
  )
}
