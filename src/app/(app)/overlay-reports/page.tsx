import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { must } from "@/lib/db"

/** Cap on rows fetched for the list view — see the query below. */
const LIST_LIMIT = 200

export const metadata = { title: "Overlay Welding Reports — ValveTrack" }
export const revalidate = 30

const STATUS_BADGE = {
  draft:     { label: "Draft",     className: "bg-warning-surface text-warning" },
  approved:  { label: "Approved",  className: "bg-success-surface text-success" },
  rejected:  { label: "Rejected",  className: "bg-danger-surface text-danger" },
  submitted: { label: "Submitted", className: "bg-info-surface text-info" },
} as const

const RESULT_BADGE = {
  accepted: { label: "Accepted", className: "bg-success-surface text-success" },
  rejected: { label: "Rejected", className: "bg-danger-surface text-danger" },
  hold:     { label: "On Hold",  className: "bg-warning-surface text-warning" },
} as const

type OverlayListRow = {
  id: string
  report_number: string | null
  report_date: string | null
  customer_name: string | null
  report_status: "draft" | "approved" | "rejected" | "submitted"
  result_status: "accepted" | "rejected" | "hold" | null
  job_card_id: string
  job_cards: { jc_number: string } | null
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default async function OverlayReportsPage() {
  await requireAuth()
  const supabase = await createClient()

  // Bounded — this table grows with every job. See LIST_LIMIT.
  const res = await supabase
    .from("overlay_welding_reports")
    .select("id, report_number, report_date, customer_name, report_status, result_status, job_card_id, job_cards(jc_number)",
            { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  const reports = must(res, "overlay welding reports") as OverlayListRow[]
  const totalCount = res.count ?? reports.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overlay Welding Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Customer submission documents for overlay welding jobs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Reports ({totalCount})
            {reports.length < totalCount && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                showing the latest {reports.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No overlay welding reports yet. Create one from a Job Card.
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => {
                const stBadge = STATUS_BADGE[r.report_status] ?? STATUS_BADGE.draft
                const resBadge = r.result_status ? RESULT_BADGE[r.result_status] : null
                return (
                  <Link
                    key={r.id}
                    href={`/overlay-reports/${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          {r.report_number ?? "Overlay Report"}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", stBadge.className)}>
                          {stBadge.label}
                        </span>
                        {resBadge && (
                          <span className={cn("rounded-full px-2 py-0.5 text-xs", resBadge.className)}>
                            {resBadge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.customer_name ?? "—"} · {fmtDate(r.report_date)}
                        {r.job_cards?.jc_number && ` · ${r.job_cards.jc_number}`}
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
