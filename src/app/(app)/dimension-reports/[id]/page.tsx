import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { DimensionStatusActions } from "@/components/dimension/dimension-status-actions"
import { DocumentCard } from "@/components/documents/document-card"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { UserRole, DimensionReport, DimensionRow } from "@/types/database"

const STATUS_BADGE = {
  draft:     { label: "Draft",     className: "bg-amber-100 text-amber-700" },
  approved:  { label: "Approved",  className: "bg-green-100 text-green-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
} as const

const RESULT_BADGE = {
  accepted: { label: "Accepted", className: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700" },
  hold:     { label: "On Hold",  className: "bg-yellow-50 text-yellow-700" },
} as const

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{value}</dd>
    </div>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

const PF_STYLE = {
  pass: "text-green-600 font-medium",
  fail: "text-destructive font-medium",
  na:   "text-muted-foreground",
}

export default async function DimensionReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const [{ data: report, error }, { data: docs }] = await Promise.all([
    supabase
      .from("dimension_reports")
      .select("*, job_cards(jc_number, client_id)")
      .eq("id", id)
      .single(),
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "dimension_report")
      .eq("entity_id", id)
      .eq("is_active", true)
      .eq("is_latest", true)
      .order("created_at", { ascending: false }),
  ])

  if (error || !report) notFound()

  const r = report as DimensionReport & { job_cards: { jc_number: string } | null }
  const status = (r.dimension_status ?? "draft") as keyof typeof STATUS_BADGE
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  const resBadge = r.result_status ? RESULT_BADGE[r.result_status] : null
  const canEdit = ["admin", "qa"].includes(userRole) && status === "draft"

  const rawDims = r.dimensions
  const dims: DimensionRow[] = Array.isArray(rawDims) ? (rawDims as unknown as DimensionRow[]) : []

  const generatedPdfDoc = docs?.find(
    (d) => d.document_type === "dimension_report" && d.document_category === "generated"
  ) ?? null

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/dimension-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Dimension Reports
        </Link>
        {r.job_cards?.jc_number && (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <Link
              href={`/job-cards/${r.job_card_id}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {r.job_cards.jc_number}
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{r.report_number ?? "Dimension Report"}</h1>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", badge.className)}>
              {badge.label}
            </span>
            {resBadge && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", resBadge.className)}>
                {resBadge.label}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{fmtDate(r.report_date)}</p>
        </div>
        {canEdit && (
          <Link
            href={`/dimension-reports/${id}/edit`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1")}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        )}
      </div>

      {/* Rejection notice */}
      {r.dimension_status === "rejected" && r.rejection_reason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <strong>Rejected:</strong> {r.rejection_reason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Job / Header info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Report Details</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <Row label="Report Number"   value={r.report_number} />
              <Row label="Report Date"     value={fmtDate(r.report_date)} />
              <Row label="Vendor"          value={r.vendor_name} />
              <Row label="Description"     value={r.description} />
              <Row label="Drawing Number"  value={r.drawing_number} />
              <Row label="Drawing Rev."    value={r.drawing_revision} />
              <Row label="PO Number"       value={r.po_number} />
              <Row label="Material Code"   value={r.material_code} />
              <Row label="Sample Number"   value={r.sample_number} />
              <Row label="Heat Number"     value={r.heat_number} />
              <Row label="MP / DP Number"  value={r.mp_dp_number} />
            </dl>
          </CardContent>
        </Card>

        {/* Inspection info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Inspection Details</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <Row label="Gauge / Instrument" value={r.gauge_used ?? r.instrument_used} />
              <Row label="Visual Inspection"  value={r.visual_satisfactory === false ? "Not Satisfactory" : r.visual_satisfactory === true ? "Satisfactory" : undefined} />
              <Row label="Inspected By"       value={r.inspected_by} />
              <Row label="Approved By"        value={r.approved_by ?? r.approved_by_name} />
              <Row label="Approved At"        value={fmtDate(r.approved_at)} />
              {r.submitted_to_customer && (
                <Row label="Submitted At"    value={fmtDate(r.submitted_at)} />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Machining info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Machining Details</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <Row label="Machine Name"    value={r.machine_name} />
              <Row label="Operator"        value={r.operator} />
              <Row label="Drawing Size"    value={r.drawing_size} />
              <Row label="Deposit Thk. — Before" value={r.weld_deposit_thickness_before} />
              <Row label="Deposit Thk. — After"  value={r.weld_deposit_thickness_after} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Table */}
      {dims.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Dimension Inspection Table</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70">
                    <th className="border border-border px-2 py-1.5 text-left font-medium">#</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Dimension / Location</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Required</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Tolerance</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Actual 1</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Actual 2</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Actual 3</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Result</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {dims.map((d, i) => (
                    <tr key={i} className={i % 2 !== 0 ? "bg-muted/20" : ""}>
                      <td className="border border-border px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="border border-border px-2 py-1.5 font-medium">{d.dimension_name}</td>
                      <td className="border border-border px-2 py-1.5">{d.required_dimension}</td>
                      <td className="border border-border px-2 py-1.5">{d.tolerance}</td>
                      <td className="border border-border px-2 py-1.5">{d.actual_value_1}</td>
                      <td className="border border-border px-2 py-1.5">{d.actual_value_2}</td>
                      <td className="border border-border px-2 py-1.5">{d.actual_value_3}</td>
                      <td className={cn("border border-border px-2 py-1.5", PF_STYLE[d.pass_fail ?? "na"] ?? PF_STYLE.na)}>
                        {d.pass_fail === "pass" ? "Pass" : d.pass_fail === "fail" ? "Fail" : "N/A"}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-muted-foreground">{d.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated PDF document card */}
      {generatedPdfDoc && (
        <Card>
          <CardHeader><CardTitle className="text-base">Generated Report</CardTitle></CardHeader>
          <CardContent>
            <DocumentCard document={generatedPdfDoc} />
          </CardContent>
        </Card>
      )}

      {/* Status actions */}
      {["admin", "qa"].includes(userRole) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent>
            <DimensionStatusActions
              reportId={id}
              dimensionStatus={status}
              userRole={userRole}
              generatedPdfPath={r.generated_pdf_path}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
