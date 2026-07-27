import { createClient } from "@/lib/supabase/server"
import { AlertsClient } from "@/components/alerts/alerts-client"
import type { JobCardWithRelations } from "@/types/database"

export const metadata = { title: "Alerts — ValveTrack" }
export const revalidate = 30

export default async function AlertsPage() {
  const supabase = await createClient()

  const [{ data: jobCards }, { data: dbAlerts }] = await Promise.all([
    supabase
      .from("job_cards")
      .select("*, client:clients(id, name), creator:profiles!created_by(id, full_name)")
      .is("deleted_at", null)
      .not("status", "eq", "closed")
      .order("stage_entered_at", { ascending: true }),
    supabase
      .from("alerts")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100),
  ])

  const all = (jobCards ?? []) as unknown as JobCardWithRelations[]
  const now = Date.now()

  const overdueJobs = all
    .filter((jc) => {
      if (jc.status === "on_hold") return true
      const days = (now - new Date(jc.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
      return days > 7
    })
    .map((jc) => ({
      ...jc,
      daysAtStage: Math.floor((now - new Date(jc.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysAtStage - a.daysAtStage)

  return (
    <AlertsClient
      overdueJobs={overdueJobs}
      dbAlerts={(dbAlerts ?? []) as Parameters<typeof AlertsClient>[0]["dbAlerts"]}
    />
  )
}
