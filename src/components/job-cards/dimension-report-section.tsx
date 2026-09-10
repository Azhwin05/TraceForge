"use client"

import Link from "next/link"
import { Ruler, Plus, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Document, JobCardStatus, UserRole } from "@/types/database"

const VISIBLE_STATUSES: JobCardStatus[] = [
  "process_assigned", "in_process", "process_complete",
  "reports_pending", "reports_complete", "dispatch_ready",
  "dispatched", "accounts_processing", "closed",
]

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

type DimSummary = {
  id: string
  report_number: string | null
  dimension_status: "draft" | "approved" | "rejected" | "submitted"
  result_status: "accepted" | "rejected" | "hold" | null
}

export function DimensionReportSection({
  jobCardId,
  status,
  userRole,
  documents,
  dimensionReports = [],
}: {
  jobCardId: string
  status: JobCardStatus
  userRole: UserRole
  documents: Document[]
  dimensionReports?: DimSummary[]
}) {
  if (!VISIBLE_STATUSES.includes(status) && documents.length === 0 && dimensionReports.length === 0) return null

  const canCreate = ["admin", "qa"].includes(userRole)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Ruler className="h-4 w-4" /> Dimension Report
          </span>
          {canCreate && (
            <Link
              href={`/dimension-reports/new?job_card_id=${jobCardId}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "text-xs h-7")}
            >
              <Plus className="h-3 w-3 mr-1" /> New Dimension Report
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {dimensionReports.length > 0 ? (
          dimensionReports.map((r) => {
            const stBadge = STATUS_BADGE[r.dimension_status] ?? STATUS_BADGE.draft
            const resBadge = r.result_status ? RESULT_BADGE[r.result_status] : null
            return (
              <Link
                key={r.id}
                href={`/dimension-reports/${r.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono font-medium">{r.report_number ?? "Dimension Report"}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", stBadge.className)}>
                    {stBadge.label}
                  </span>
                  {resBadge && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", resBadge.className)}>
                      {resBadge.label}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">No dimension reports yet.</p>
        )}

        {/* Legacy uploaded documents (backward compat) */}
        {documents.length > 0 && (
          <div className="pt-2 border-t border-border space-y-1">
            <p className="text-xs text-muted-foreground">Uploaded documents</p>
            {documents.map((doc) => (
              <p key={doc.id} className="text-xs text-muted-foreground">
                {doc.document_name ?? doc.file_name}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
