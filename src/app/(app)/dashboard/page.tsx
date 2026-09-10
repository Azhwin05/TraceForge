import Link from "next/link"
import type { Metadata } from "next"
import {
  Activity,
  Clock,
  FileSearch,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { QuickSearch } from "@/components/search/quick-search"
import type { JobCardWithRelations } from "@/types/database"

export const metadata: Metadata = { title: "Dashboard — ValveTrack" }
export const revalidate = 60

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

  // Overdue leads because it is the only number that demands action today.
  const stats = [
    { label: "Overdue", value: overdueCount ?? 0, hint: "past due date", icon: AlertTriangle, tone: (overdueCount ?? 0) > 0 ? ("danger" as const) : ("success" as const), href: "/job-cards?filter=overdue" },
    { label: "Active Jobs", value: totalActive ?? 0, hint: "excluding closed", icon: Activity, tone: "brand" as const, href: "/job-cards" },
    { label: "In Process", value: inProcess ?? 0, hint: "on the shop floor", icon: Clock, tone: "info" as const, href: "/job-cards" },
    { label: "Reports Due", value: awaitingReports ?? 0, hint: "awaiting QA", icon: FileSearch, tone: "warning" as const, href: "/job-cards" },
    { label: "Dispatched", value: dispatchedMonth ?? 0, hint: "this month", icon: Send, tone: "neutral" as const },
    { label: "Closed", value: closedMonth ?? 0, hint: "this month", icon: CheckCircle2, tone: "success" as const },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of active jobs across Raghav Engineering."
      />

      {/* Universal search (client request #4) — same server action as /search,
          so the two can never disagree about what is searchable. */}
      <QuickSearch />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Blocked / Overdue</CardTitle>
            <CardAction>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                {blocked.length} job{blocked.length !== 1 ? "s" : ""}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            {blocked.length === 0 ? (
              <EmptyState
                compact
                icon={ShieldCheck}
                title="Nothing is stuck"
                description="No job is on hold or sitting in the same stage for more than 7 days."
              />
            ) : (
              <div className="space-y-1.5">
                {blocked.slice(0, 6).map((jc) => {
                  const days = Math.floor(
                    (Date.now() - new Date(jc.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <Link
                      key={jc.id}
                      href={`/job-cards/${jc.id}`}
                      className="group flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-border-strong hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {/* basis-full below sm so the JC number — the identifier —
                          never truncates to make room for the status chip. */}
                      <div className="min-w-0 basis-full sm:basis-auto">
                        <p className="truncate font-medium text-foreground">{jc.jc_number}</p>
                        <p className="truncate text-xs text-muted-foreground">{jc.client?.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={jc.status} />
                        <span
                          className={cn(
                            "w-9 text-right text-xs tabular",
                            days >= 14 ? "font-medium text-danger" : "text-muted-foreground"
                          )}
                        >
                          {days}d
                        </span>
                      </div>
                    </Link>
                  )
                })}
                {blocked.length > 6 && (
                  <Link
                    href="/job-cards"
                    className="flex items-center justify-center gap-1 pt-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {blocked.length - 6} more
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Job Cards</CardTitle>
            <CardAction>
              <Link
                href="/job-cards"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                compact
                title="No job cards yet"
                description="Job cards track a valve from receipt through inspection to dispatch."
                action={
                  <Link
                    href="/job-cards/new"
                    className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-600"
                  >
                    Create the first job card
                  </Link>
                }
              />
            ) : (
              <div className="space-y-1.5">
                {recent.map((jc) => (
                  <Link
                    key={jc.id}
                    href={`/job-cards/${jc.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-border-strong hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{jc.jc_number}</p>
                      <p className="truncate text-xs text-muted-foreground">{jc.description}</p>
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
