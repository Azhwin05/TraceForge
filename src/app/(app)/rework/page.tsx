import Link from "next/link"
import { Wrench, ChevronRight } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { must } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReworkStatus } from "@/types/database"

export const metadata = { title: "Rework — ValveTrack" }

/** Cap on rows fetched for the list view. */
const LIST_LIMIT = 200

const STATUS_BADGE: Record<ReworkStatus, { label: string; className: string }> = {
  open:        { label: "Open",        className: "bg-danger-surface text-danger" },
  in_progress: { label: "In Progress", className: "bg-warning-surface text-warning" },
  completed:   { label: "Completed",   className: "bg-success-surface text-success" },
}

type ReworkListRow = {
  id: string; job_card_id: string; rework_date: string; stage: string
  reason: string; quantity: number; status: ReworkStatus
  job_cards: { jc_number: string } | null
}

export default async function ReworkPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const { supabase } = await requireAuth()

  let query = supabase
    .from("rework_records")
    .select("id, job_card_id, rework_date, stage, reason, quantity, status, job_cards(jc_number)",
            { count: "exact" })
    .order("rework_date", { ascending: false })

  // Only filter on a value the enum actually allows — an arbitrary ?status=
  // would otherwise reach Postgres and error rather than being ignored.
  const statusFilter = sp.status && sp.status in STATUS_BADGE ? (sp.status as ReworkStatus) : null
  if (statusFilter) query = query.eq("status", statusFilter)

  const res = await query.limit(LIST_LIMIT)
  const records = must(res, "rework records") as ReworkListRow[]
  const totalCount = res.count ?? records.length

  const openCount = records.filter((r) => r.status === "open").length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wrench className="h-6 w-6" /> Rework
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every recorded instance of work being redone, across all job cards.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink active={!statusFilter} href="/rework" label={`All (${totalCount})`} />
        <FilterLink active={statusFilter === "open"}        href="/rework?status=open"        label="Open" />
        <FilterLink active={statusFilter === "in_progress"} href="/rework?status=in_progress" label="In Progress" />
        <FilterLink active={statusFilter === "completed"}   href="/rework?status=completed"   label="Completed" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {statusFilter ? STATUS_BADGE[statusFilter].label : "All"} Rework ({totalCount})
            {records.length < totalCount && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                showing the latest {records.length}
              </span>
            )}
            {!statusFilter && openCount > 0 && (
              <span className="ml-2 text-xs font-normal text-danger">{openCount} still open</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No rework recorded{statusFilter ? ` with status "${STATUS_BADGE[statusFilter].label}"` : ""}.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {records.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.open
                return (
                  <Link
                    key={r.id}
                    href={`/job-cards/${r.job_card_id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium text-brand-primary">
                          {r.job_cards?.jc_number ?? "—"}
                        </span>
                        <span className="font-medium">{r.stage}</span>
                        <Badge className={cn(badge.className)}>{badge.label}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{r.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {r.quantity} ·{" "}
                        {new Date(r.rework_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FilterLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
               : "border-input text-muted-foreground hover:bg-muted/50",
      )}
    >
      {label}
    </Link>
  )
}
