import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { PmiStatusActions } from "@/components/pmi/pmi-status-actions"
import { FileUpload } from "@/components/documents/file-upload"
import { DocumentCard } from "@/components/documents/document-card"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole, PmiReport, PmiReadings } from "@/types/database"

const STATUS_BADGE = {
  draft:     { label: "Draft",     className: "bg-warning-surface text-warning" },
  approved:  { label: "Approved",  className: "bg-success-surface text-success" },
  rejected:  { label: "Rejected",  className: "bg-danger-surface text-danger" },
  submitted: { label: "Submitted", className: "bg-info-surface text-info" },
} as const

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
    </div>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

function fmt(n: number | null | undefined) {
  return n != null ? n.toFixed(2) : "—"
}

export default async function PmiReportDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const [{ data: report, error }, { data: docs }] = await Promise.all([
    supabase
      .from("pmi_reports")
      .select("*, job_cards(jc_number, client_id)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "pmi_report")
      .eq("entity_id", params.id)
      .eq("is_active", true)
      .eq("is_latest", true)
      .order("created_at", { ascending: false }),
  ])

  if (error || !report) notFound()

  const r = report as PmiReport & { job_cards: { jc_number: string } | null }
  const status = (r.pmi_status ?? "draft") as keyof typeof STATUS_BADGE
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  // Admin can always edit; QA stays limited to draft, matching the server action.
  const canEdit = userRole === "admin" || (userRole === "qa" && status === "draft")
  const rawReadings = r.readings
  const readings: PmiReadings = Array.isArray(rawReadings) ? (rawReadings as unknown as PmiReadings) : []

  const annotatedDrawingDoc = docs?.find((d) => d.document_type === "annotated_drawing") ?? null
  const generatedPdfDoc = docs?.find((d) => d.document_type === "pmi_report" && d.document_category === "generated") ?? null

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/pmi-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> PMI Reports
        </Link>
        {r.job_cards && (
          <>
            <span className="text-muted-foreground">·</span>
            <Link
              href={`/job-cards/${r.job_card_id}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Job Card {r.job_cards.jc_number}
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {r.report_number ?? "PMI Report"}
          </h1>
          {r.report_date && (
            <p className="text-sm text-muted-foreground mt-0.5">{fmtDate(r.report_date)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.className)}>
            {badge.label}
          </span>
          <span className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            r.result === "acceptable" ? "bg-success-surface text-success" : "bg-danger-surface text-danger"
          )}>
            {r.result === "acceptable" ? "Accepted" : "Not Accepted"}
          </span>
          {canEdit && (
            <Link
              href={`/pmi-reports/${r.id}/edit`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {status === "rejected" && r.rejection_reason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <strong>Rejection Reason:</strong> {r.rejection_reason}
        </div>
      )}

      {/* Header fields */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Report Details</h2>
        <dl className="divide-y divide-border">
          <Row label="Report No."            value={r.report_number} />
          <Row label="Date"                  value={fmtDate(r.report_date)} />
          <Row label="Customer"              value={r.customer} />
          <Row label="Order / PO No."        value={r.order_number} />
          <Row label="Item No."              value={r.item_no} />
          <Row label="Quantity"              value={r.quantity} />
          <Row label="Valve Size & Class"    value={r.valve_size_class} />
          <Row label="Valve Type / Comp."    value={r.valve_type_component} />
          <Row label="Base Material"         value={r.base_material} />
          <Row label="Overlay Material"      value={r.overlay_material} />
          <Row label="Drawing No."           value={r.drawing_number} />
          <Row label="Procedure Ref."        value={r.procedure_ref} />
          <Row label="Heat No."              value={r.heat_no} />
          <Row label="Inspected By"          value={r.inspected_by} />
        </dl>
      </div>

      {/* Instrument */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Instrument Details</h2>
        <dl className="divide-y divide-border">
          <Row label="Instrument"       value={r.instrument_name} />
          <Row label="Serial No."       value={r.instrument_serial} />
          <Row label="Calibration Due"  value={fmtDate(r.calibration_due)} />
        </dl>
      </div>

      {/* Readings table */}
      {readings.length > 0 && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-3">PMI Readings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-left">Location</th>
                  <th className="border border-border px-3 py-2 text-left">Heat No.</th>
                  <th className="border border-border px-2 py-2 text-center">Reading</th>
                  {(["Ni %", "Cr %", "Mo %", "Fe %", "Nb %", "Ti %"] as const).map((h) => (
                    <th key={h} className="border border-border px-2 py-2 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.flatMap((loc, li) =>
                  loc.items.map((item, ri) => (
                    <tr key={`${li}-${ri}`} className={ri % 2 === 0 ? "" : "bg-muted/30"}>
                      <td className="border border-border px-3 py-1.5">{ri === 0 ? loc.location_name : ""}</td>
                      <td className="border border-border px-3 py-1.5 text-muted-foreground">{ri === 0 ? (loc.heat_no ?? "") : ""}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{item.reading_no}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{fmt(item.ni)}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{fmt(item.cr)}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{fmt(item.mo)}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{fmt(item.fe)}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{fmt(item.nb)}</td>
                      <td className="border border-border px-2 py-1.5 text-center">{fmt(item.ti)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Annotated Drawing */}
      <div className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="font-semibold">Annotated Drawing</h2>
        <DocumentCard
          document={annotatedDrawingDoc}
          storagePath={r.annotated_drawing_path}
        />
        {["admin", "qa"].includes(userRole) && (
          <FileUpload
            entityType="pmi_report"
            entityId={r.id}
            documentType="annotated_drawing"
            userRole={userRole}
            jobCardId={r.job_card_id}
            sourceModule="pmi_report"
            label="Upload Annotated Drawing"
          />
        )}
      </div>

      {/* Generated PDF */}
      {generatedPdfDoc && (
        <div className="rounded-lg border border-border p-5 space-y-3">
          <h2 className="font-semibold">Generated PDF</h2>
          <DocumentCard document={generatedPdfDoc} />
        </div>
      )}

      {/* Approval info */}
      {(r.approved_by_name || r.approved_at) && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-3">Approval</h2>
          <dl className="divide-y divide-border">
            <Row label="Approved By" value={r.approved_by_name} />
            <Row label="Approved At" value={fmtDate(r.approved_at)} />
            {r.submitted_to_customer && (
              <Row label="Submitted At" value={fmtDate(r.submitted_at)} />
            )}
          </dl>
        </div>
      )}

      {/* Actions */}
      {["admin", "qa"].includes(userRole) && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-3">Actions</h2>
          <PmiStatusActions
            reportId={r.id}
            pmiStatus={status}
            userRole={userRole}
            generatedPdfPath={r.generated_pdf_path}
            reportNumber={r.report_number}
          />
        </div>
      )}
    </div>
  )
}
