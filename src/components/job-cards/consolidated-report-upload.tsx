import { FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/documents/file-upload"
import type { UserRole } from "@/types/database"

/**
 * Client request: "either fill in these structured reports, or upload one
 * complete PDF, and proceed to the next step" — not a replacement for the
 * PMI/Dimension/Overlay flow, an alternative to it, for jobs where a signed
 * report document already exists and re-keying it into the structured forms
 * is pure duplication.
 *
 * The status transition itself is NOT handled here — it's a database trigger
 * (trg_after_consolidated_report_upload, migration 0060) that fires the
 * moment a matching document lands, so it happens identically whether the
 * upload comes from this box or anywhere else, and can't drift out of sync
 * with the job_card_gate_blockers rule that also accepts it.
 */
export function ConsolidatedReportUpload({
  jobCardId, userRole,
}: {
  jobCardId: string
  userRole: UserRole
}) {
  const canUpload = ["admin", "qa"].includes(userRole)
  if (!canUpload) return null

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Or Upload One Complete Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Already have a single signed PDF covering the inspection for this job? Upload it here instead
          of filling in PMI, Dimension or Overlay separately — the job moves to Reports Complete
          automatically as soon as it&rsquo;s uploaded.
        </p>
        <FileUpload
          entityType="job_card"
          entityId={jobCardId}
          documentType="consolidated_report"
          userRole={userRole}
          jobCardId={jobCardId}
          sourceModule="job_card_reports"
          label="Upload Complete Report PDF"
        />
      </CardContent>
    </Card>
  )
}
