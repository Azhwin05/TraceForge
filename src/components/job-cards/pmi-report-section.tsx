"use client"

import Link from "next/link"
import { FlaskConical, Plus, ChevronRight } from "lucide-react"
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
  draft:     { label: "Draft",     className: "bg-amber-100 text-amber-700" },
  approved:  { label: "Approved",  className: "bg-green-100 text-green-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
} as const

type PmiSummary = {
  id: string
  report_number: string | null
  pmi_status: "draft" | "approved" | "rejected" | "submitted"
  result: "acceptable" | "not_acceptable"
}

export function PmiReportSection({
  jobCardId,
  status,
  userRole,
  documents,
  pmiReports = [],
}: {
  jobCardId: string
  status: JobCardStatus
  userRole: UserRole
  documents: Document[]
  pmiReports?: PmiSummary[]
}) {
  if (!VISIBLE_STATUSES.includes(status) && documents.length === 0 && pmiReports.length === 0) return null

  const canCreate = ["admin", "qa"].includes(userRole)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> PMI Report
          </span>
          {canCreate && (
            <Link
              href={`/pmi-reports/new?job_card_id=${jobCardId}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "text-xs h-7")}
            >
              <Plus className="h-3 w-3 mr-1" /> New PMI Report
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pmiReports.length > 0 ? (
          pmiReports.map((r) => {
            const badge = STATUS_BADGE[r.pmi_status] ?? STATUS_BADGE.draft
            return (
              <Link
                key={r.id}
                href={`/pmi-reports/${r.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono font-medium">{r.report_number ?? "PMI Report"}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", badge.className)}>
                    {badge.label}
                  </span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    r.result === "acceptable" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {r.result === "acceptable" ? "Accepted" : "Not Accepted"}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">No PMI reports yet.</p>
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
