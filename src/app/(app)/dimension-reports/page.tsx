import Link from "next/link"
import { Ruler, Plus, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getSessionWithProfile } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"
import { must } from "@/lib/db"

/** Cap on rows fetched for the list view — see the query below. */
const LIST_LIMIT = 200

export const metadata = { title: "Dimension Reports — ValveTrack" }
export const revalidate = 30

const STATUS_BADGE = {
  draft:     "bg-amber-100 text-amber-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  submitted: "bg-blue-100 text-blue-700",
} as const

const RESULT_BADGE = {
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  hold:     "bg-yellow-50 text-yellow-700",
} as const

type DimListRow = {
  id: string
  report_number: string | null
  report_date: string | null
  dimension_status: "draft" | "approved" | "rejected" | "submitted"
  result_status: "accepted" | "rejected" | "hold" | null
  job_card_id: string
  job_cards: { jc_number: string } | null
}

export default async function DimensionReportsPage() {
  const supabase = await createClient()
  const session = await getSessionWithProfile()
  const userRole = (session?.profile?.role ?? "operator") as UserRole

  // Bounded — this table grows with every job. See LIST_LIMIT.
  const res = await supabase
    .from("dimension_reports")
    .select("id, report_number, report_date, dimension_status, result_status, job_card_id, job_cards(jc_number)",
            { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  const reports = must(res, "dimension reports") as DimListRow[]
  const totalCount = res.count ?? reports.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ruler className="h-6 w-6" /> Dimension Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Dimensional inspection records for job cards</p>
        </div>
        {["admin", "qa"].includes(userRole) && (
          <Link
            href="/dimension-reports/new"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> New Report
          </Link>
        )}
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
              No dimension reports yet.{" "}
              {["admin", "qa"].includes(userRole) && (
                <Link href="/dimension-reports/new" className="text-primary hover:underline">
                  Create one from a Job Card.
                </Link>
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => {
                const stBadge = STATUS_BADGE[r.dimension_status] ?? STATUS_BADGE.draft
                const resBadge = r.result_status ? RESULT_BADGE[r.result_status] : null
                return (
                  <Link
                    key={r.id}
                    href={`/dimension-reports/${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2.5 text-sm">
                      <span className="font-mono font-medium">{r.report_number ?? "Untitled"}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", stBadge)}>
                        {r.dimension_status.charAt(0).toUpperCase() + r.dimension_status.slice(1)}
                      </span>
                      {resBadge && r.result_status && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", resBadge)}>
                          {r.result_status.charAt(0).toUpperCase() + r.result_status.slice(1)}
                        </span>
                      )}
                      {r.job_cards?.jc_number && (
                        <span className="text-xs text-muted-foreground">JC: {r.job_cards.jc_number}</span>
                      )}
                      {r.report_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.report_date).toLocaleDateString("en-IN")}
                        </span>
                      )}
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
