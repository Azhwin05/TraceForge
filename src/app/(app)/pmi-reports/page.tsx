import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { must } from "@/lib/db"
import { ChevronRight, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

/** Cap on rows fetched for the list view — see the query below. */
const LIST_LIMIT = 200

const STATUS_BADGE = {
  draft:     { label: "Draft",     className: "bg-warning-surface text-warning" },
  approved:  { label: "Approved",  className: "bg-success-surface text-success" },
  rejected:  { label: "Rejected",  className: "bg-danger-surface text-danger" },
  submitted: { label: "Submitted", className: "bg-info-surface text-info" },
} as const

export default async function PmiReportsPage() {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  type PmiListRow = {
    id: string; report_number: string | null; report_date: string | null
    customer: string | null; pmi_status: "draft" | "approved" | "rejected" | "submitted"
    job_card_id: string; result: "acceptable" | "not_acceptable"
    job_cards: { jc_number: string } | null
  }

  // Bounded: this table grows with every job, and the page previously fetched
  // every row on each load. `count: "exact"` still reports the true total so
  // the header stays honest when the list is truncated.
  const res = await supabase
    .from("pmi_reports")
    .select("id, report_number, report_date, customer, pmi_status, job_card_id, result, job_cards(jc_number)",
            { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  const reports = must(res, "PMI reports") as PmiListRow[]
  const totalCount = res.count ?? reports.length

  const canCreate = ["admin", "qa"].includes(userRole)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PMI Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} report{totalCount !== 1 ? "s" : ""} total
            {reports.length < totalCount && ` — showing the latest ${reports.length}`}
          </p>
        </div>
      </div>

      {!reports.length ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No PMI reports yet.</p>
          {canCreate && (
            <p className="text-xs text-muted-foreground mt-1">
              Create a PMI report from a Job Card detail page.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {reports.map((r) => {
            const status = (r.pmi_status ?? "draft") as keyof typeof STATUS_BADGE
            const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft
            const jcNum = (r.job_cards as { jc_number?: string } | null)?.jc_number
            return (
              <Link
                key={r.id}
                href={`/pmi-reports/${r.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium font-mono text-brand-primary">
                      {r.report_number ?? "—"}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>
                      {badge.label}
                    </span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      r.result === "acceptable" ? "bg-success-surface text-success" : "bg-danger-surface text-danger"
                    )}>
                      {r.result === "acceptable" ? "Accepted" : "Not Accepted"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {jcNum && <span>Job Card: {jcNum}</span>}
                    {r.customer && <span>{r.customer}</span>}
                    {r.report_date && (
                      <span>
                        {new Date(r.report_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
