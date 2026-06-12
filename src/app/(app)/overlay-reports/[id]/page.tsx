import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { OverlayStatusActions } from "@/components/overlay/overlay-status-actions"
import { DocumentCard } from "@/components/documents/document-card"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { UserRole, OverlayReport, OverlayReportStatus, OverlayChemicalEntry } from "@/types/database"

export const metadata = { title: "Overlay Welding Report — ValveTrack" }

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
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

export default async function OverlayReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const [{ data: report, error }, { data: docs }] = await Promise.all([
    supabase
      .from("overlay_welding_reports")
      .select("*, job_cards(jc_number)")
      .eq("id", id)
      .single(),
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "overlay_report")
      .eq("entity_id", id)
      .eq("is_active", true)
      .eq("is_latest", true)
      .order("created_at", { ascending: false }),
  ])

  if (error || !report) notFound()

  const r = report as OverlayReport & { job_cards: { jc_number: string } | null }
  const status = (r.report_status ?? "draft") as OverlayReportStatus
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  const resBadge = r.result_status ? RESULT_BADGE[r.result_status] : null
  const canEdit = ["admin", "qa"].includes(userRole) && status === "draft"

  const chemicals: OverlayChemicalEntry[] = Array.isArray(r.chemicals_used_json)
    ? (r.chemicals_used_json as unknown as OverlayChemicalEntry[])
    : []

  const generatedPdfDoc = docs?.find(
    (d) => d.document_type === "overlay_welding_report" && d.document_category === "generated"
  ) ?? null

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/overlay-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Overlay Reports
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
            <h1 className="text-2xl font-bold">{r.report_number ?? "Overlay Welding Report"}</h1>
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
            href={`/overlay-reports/${id}/edit`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1")}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        )}
      </div>

      {/* Rejection notice */}
      {r.report_status === "rejected" && r.rejection_reason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <strong>Rejected:</strong> {r.rejection_reason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Report header details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Report Details</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <Row label="Report Number"   value={r.report_number} />
              <Row label="Report Date"     value={fmtDate(r.report_date)} />
              <Row label="Vendor Name"     value={r.vendor_name} />
              <Row label="Vendor No."      value={r.vendor_number} />
              <Row label="Customer"        value={r.customer_name} />
              <Row label="PO Number"       value={r.po_number} />
              <Row label="NBDN Number"     value={r.nbdn_number} />
              <Row label="Material Code"   value={r.material_code} />
              <Row label="Drawing No."     value={r.drawing_number} />
              <Row label="WPS No."         value={r.wps_number} />
              <Row label="Item / Desc."    value={r.item_description} />
              <Row label="Quantity"        value={r.quantity} />
              <Row label="Base Mat. Grade" value={r.base_material_grade} />
              <Row label="Heat No."        value={r.heat_number} />
              <Row label="Test Coupon No." value={r.test_coupon_number} />
              <Row label="Dim. Report No." value={r.dimension_report_number} />
            </dl>
          </CardContent>
        </Card>

        {/* Welding details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Welding Details</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <Row label="Job Card No."    value={r.job_card_number} />
              <Row label="Job Card Date"   value={fmtDate(r.job_card_date)} />
              <Row label="Welder Name"     value={r.welder_name} />
              <Row label="Date of Welding" value={fmtDate(r.date_of_welding)} />
              <Row label="Process"         value={r.process} />
              <Row label="Deposit Material" value={r.deposit_material} />
              <Row label="AWS Class No."   value={r.aws_class_number} />
              <Row label="Consumable Make" value={r.consumable_make} />
              <Row label="Batch No."       value={r.consumable_batch_number} />
              <Row label="HT Chart No."    value={r.heat_treatment_chart_number} />
              <Row label="Visual Exam."    value={r.visual_examination} />
              <Row label="Hard. Required"  value={r.hardness_required} />
              <Row label="Hard. Actual"    value={r.hardness_actual} />
              <Row label="Dep. Condition"  value={r.deposit_thickness_condition} />
              <Row label="Dep. Required"   value={r.deposit_thickness_required} />
              <Row label="Dep. Actual"     value={r.deposit_thickness_actual} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* LPT / NDE */}
      <Card>
        <CardHeader><CardTitle className="text-base">LPT / NDE Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            <dl>
              <Row label="Procedure Ref."    value={r.lpt_procedure_ref} />
              <Row label="Type of Penetrant" value={r.type_of_penetrant} />
              <Row label="Stage of Test"     value={r.stage_of_test} />
              <Row label="Surface Condition" value={r.surface_condition} />
              <Row label="Penet. Application" value={r.penetrant_application} />
              <Row label="Penet. Removal"    value={r.penetrant_removal} />
            </dl>
            <dl>
              <Row label="Penet. Dwell Time" value={r.penetrant_dwell_time} />
              <Row label="Temp. of Part"     value={r.temperature_of_part} />
              <Row label="Dev. Application"  value={r.developer_application} />
              <Row label="Dev. Dwell Time"   value={r.developer_dwell_time} />
              <Row label="Post Cleaning"     value={r.post_cleaning} />
              <Row label="Evaluation"        value={r.evaluation_of_dp_test} />
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Chemicals */}
      {chemicals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Chemicals Used</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70">
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Type</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Chemical</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Manufacturer</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Batch No.</th>
                    <th className="border border-border px-2 py-1.5 text-left font-medium">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {chemicals.map((ch, i) => (
                    <tr key={i} className={i % 2 !== 0 ? "bg-muted/20" : ""}>
                      <td className="border border-border px-2 py-1.5 capitalize">{ch.chemical_type}</td>
                      <td className="border border-border px-2 py-1.5 font-medium">{ch.chemical_name}</td>
                      <td className="border border-border px-2 py-1.5">{ch.manufacturer}</td>
                      <td className="border border-border px-2 py-1.5">{ch.batch_no}</td>
                      <td className="border border-border px-2 py-1.5">{ch.expiry_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign-off */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sign-off</CardTitle></CardHeader>
        <CardContent>
          <dl>
            <Row label="Remarks"     value={r.remarks} />
            <Row label="Inspected By" value={r.inspected_by} />
            <Row label="Approved By"  value={r.approved_by} />
            <Row label="Approved At"  value={fmtDate(r.approved_at)} />
            {r.submitted_to_customer && (
              <Row label="Submitted At" value={fmtDate(r.submitted_at)} />
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Generated PDF */}
      {generatedPdfDoc && (
        <Card>
          <CardHeader><CardTitle className="text-base">Generated Report</CardTitle></CardHeader>
          <CardContent>
            <DocumentCard document={generatedPdfDoc} />
          </CardContent>
        </Card>
      )}

      {/* Status Actions */}
      {["admin", "qa"].includes(userRole) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent>
            <OverlayStatusActions
              reportId={id}
              reportStatus={status}
              userRole={userRole}
              generatedPdfPath={r.generated_pdf_path}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
