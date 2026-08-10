import Link from "next/link"
import type { Metadata } from "next"
import { Activity, Clock, FileSearch, Send, CheckCircle2, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { QuickSearch } from "@/components/search/quick-search"
import type { JobCardWithRelations } from "@/types/database"

export const metadata: Metadata = { title: "Dashboard — ValveTrack" }
export const revalidate = 60

const STAT_ICONS = [Activity, Clock, FileSearch, Send, CheckCircle2]
const STAT_COLORS = [
  "text-blue-600 bg-blue-50",
  "text-orange-600 bg-orange-50",
  "text-amber-600 bg-amber-50",
  "text-teal-600 bg-teal-50",
  "text-green-600 bg-green-50",
]

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground mt-1.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2.5 shrink-0 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const pad = (n: number) => String(n).padStart(2, "0")
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  // All 7 queries fire in parallel — no sequential waterfalls
  const [
    { count: totalActive },
    { count: inProcess },
    { count: awaitingReports },
    { count: dispatchedMonth },
    { count: closedMonth },
    { count: overdueCount },
    { data: recentRaw },
    { data: blockedRaw },
  ] = await Promise.all([
    // stat 1: active jobs (not closed)
    supabase
      .from("job_cards")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .neq("status", "closed"),

    // stat 2: currently in process
    supabase
      .from("job_cards")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "in_process"),

    // stat 3: awaiting reports
    supabase
      .from("job_cards")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("status", ["reports_pending", "process_complete"]),

    // stat 4: dispatched this month (use created_at on dispatches table — accurate)
    supabase
      .from("dispatches")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),

    // stat 5: closed this month
    supabase
      .from("job_cards")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "closed")
      .gte("updated_at", monthStart),

    // stat 6: overdue (due date passed, still on the shop floor)
    supabase
      .from("job_cards")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .lt("due_date", today)
      .not("status", "in", "(dispatched,accounts_processing,closed)"),

    // recent 8 job cards for the list
    supabase
      .from("job_cards")
      .select("id, jc_number, description, status, client:clients(id, name)")
      .is("deleted_at", null)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(8),

    // blocked: on_hold OR stuck > 7 days — fetch only what we need
    supabase
      .from("job_cards")
      .select("id, jc_number, status, stage_entered_at, client:clients(id, name)")
      .is("deleted_at", null)
      .neq("status", "closed")
      .or(`status.eq.on_hold,stage_entered_at.lte.${sevenDaysAgo}`)
      .order("stage_entered_at", { ascending: true })
      .limit(10),
  ])

  const recent = (recentRaw ?? []) as unknown as JobCardWithRelations[]
  const blocked = (blockedRaw ?? []) as unknown as JobCardWithRelations[]

  const stats = [
    { title: "Active Jobs",     value: totalActive ?? 0,     sub: "excl. closed", icon: STAT_ICONS[0], color: STAT_COLORS[0] },
    { title: "Overdue",         value: overdueCount ?? 0,    sub: "past due date", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { title: "In Process",      value: inProcess ?? 0,       sub: "in progress",  icon: STAT_ICONS[1], color: STAT_COLORS[1] },
    { title: "Reports Pending", value: awaitingReports ?? 0, sub: "awaiting QA",  icon: STAT_ICONS[2], color: STAT_COLORS[2] },
    { title: "Dispatched",      value: dispatchedMonth ?? 0, sub: "this month",   icon: STAT_ICONS[3], color: STAT_COLORS[3] },
    { title: "Closed",          value: closedMonth ?? 0,     sub: "this month",   icon: STAT_ICONS[4], color: STAT_COLORS[4] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of active jobs across Raghav Engineering.</p>
      </div>

      {/* Universal search (client request #4) — same server action as /search,
          so the two can never disagree about what is searchable. */}
      <QuickSearch />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {stats.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Blocked / Overdue
              <span className="text-sm font-normal text-muted-foreground">
                {blocked.length} job{blocked.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blocked.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No blocked jobs — all clear.</p>
            ) : (
              <div className="space-y-2">
                {blocked.slice(0, 6).map((jc) => {
                  const days = Math.floor(
                    (Date.now() - new Date(jc.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <Link
                      key={jc.id}
                      href={`/job-cards/${jc.id}`}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{jc.jc_number}</p>
                        <p className="text-xs text-muted-foreground">{jc.client?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={jc.status} />
                        <span className="text-xs text-muted-foreground">{days}d</span>
                      </div>
                    </Link>
                  )
                })}
                {blocked.length > 6 && (
                  <Link href="/job-cards" className="block text-center text-xs text-muted-foreground hover:underline pt-1">
                    +{blocked.length - 6} more →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Recent Job Cards
              <Link href="/job-cards" className="text-sm font-normal text-muted-foreground hover:underline">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No job cards yet.{" "}
                <Link href="/job-cards/new" className="text-brand-primary hover:underline">
                  Create the first one.
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map((jc) => (
                  <Link
                    key={jc.id}
                    href={`/job-cards/${jc.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{jc.jc_number}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{jc.description}</p>
                    </div>
                    <StatusBadge status={jc.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
