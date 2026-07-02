import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { isValidUUID } from "@/lib/security"
import { PwhtRunDetailClient } from "@/components/pwht/pwht-run-detail-client"
import type { PwhtRun, PwhtChartReading, PwhtJobStatus, UserRole } from "@/types/database"

export const metadata = { title: "PWHT Run — ValveTrack" }

type RunJob = {
  id: string
  job_card_id: string
  status: PwhtJobStatus
  job_cards: { jc_number: string; description: string; pwht_required: boolean } | null
}

export default async function PwhtRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!isValidUUID(id)) notFound()

  const { supabase, profile } = await requireAuth()

  const [{ data: run }, { data: readings }, { data: runJobs }] = await Promise.all([
    supabase.from("pwht_runs").select("*").eq("id", id).single(),
    supabase
      .from("pwht_chart_readings")
      .select("*")
      .eq("pwht_run_id", id)
      .order("recorded_at", { ascending: true })
      .limit(5000),
    supabase
      .from("pwht_run_jobs")
      .select("id, job_card_id, status, job_cards(jc_number, description, pwht_required)")
      .eq("pwht_run_id", id),
  ])

  if (!run) notFound()

  return (
    <PwhtRunDetailClient
      run={run as PwhtRun}
      readings={(readings ?? []) as PwhtChartReading[]}
      runJobs={(runJobs ?? []) as unknown as RunJob[]}
      userRole={(profile?.role ?? "operator") as UserRole}
    />
  )
}
