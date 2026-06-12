import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, PackageCheck, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DossierStatusActions } from "@/components/dossier/dossier-status-actions"
import { cn } from "@/lib/utils"
import type { CustomerDossier, DossierStatus, DossierDocument, UserRole } from "@/types/database"

export const metadata = { title: "Dossier — ValveTrack" }

const STATUS_BADGE: Record<DossierStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  generated: { label: "Generated", className: "bg-blue-100 text-blue-700" },
  submitted: { label: "Submitted", className: "bg-green-100 text-green-700" },
  archived:  { label: "Archived",  className: "bg-slate-100 text-slate-500" },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  overlay_welding_report: "Overlay Welding Report",
  pmi_report:             "PMI Report",
  dimension_report:       "Dimension Report",
  pwht_chart:             "PWHT Chart",
  wps_pdf:                "WPS PDF",
  pqr_pdf:                "PQR PDF",
  dispatch_doc:           "Dispatch Document",
  customer_drawing:       "Customer Drawing",
  calibration_cert:       "Calibration Certificate",
  customer_po:            "Customer PO",
  invoice:                "Invoice",
  other:                  "Other",
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

type DossierDocWithDoc = DossierDocument & {
  document: {
    id: string
    document_type: string
    document_name: string | null
    file_name: string
    version: number
    approval_status: string
    source_module: string | null
    document_category: "uploaded" | "generated"
    is_active: boolean
  } | null
}

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const supabase = await createClient()

  const [{ data: rawDossier }, { data: rawDossierDocs }] = await Promise.all([
    supabase
      .from("customer_dossiers")
      .select("*, job_cards(id, jc_number, po_number)")
      .eq("id", id)
      .single(),
    supabase
      .from("customer_dossier_documents")
      .select("*, document:documents(id, document_type, document_name, file_name, version, approval_status, source_module, document_category, is_active)")
      .eq("dossier_id", id)
      .order("sort_order"),
  ])

  if (!rawDossier) notFound()

  const dossier = rawDossier as CustomerDossier & {
    job_cards: { id: string; jc_number: string; po_number: string | null } | null
  }
  const dossierDocs = (rawDossierDocs ?? []) as DossierDocWithDoc[]
  const badge = STATUS_BADGE[dossier.status]
  const canWrite = ["admin", "qa"].includes(userRole)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/dossiers"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dossiers
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold font-mono">{dossier.dossier_number}</h1>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", badge.className)}>
            {badge.label}
          </span>
          {dossier.submitted_to_customer && (
            <span className="text-xs text-green-700 font-medium">✓ Submitted to Customer</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          {/* Dossier Metadata */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dossier Details</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Dossier Number" value={<span className="font-mono">{dossier.dossier_number}</span>} />
              <InfoRow label="Dossier Date"   value={fmtDate(dossier.dossier_date)} />
              <InfoRow label="Status"         value={<span className={cn("rounded-full px-2 py-0.5 text-xs", badge.className)}>{badge.label}</span>} />
              <InfoRow label="Prepared By"    value={dossier.prepared_by} />
              <InfoRow label="Approved By"    value={dossier.approved_by} />
              {dossier.remarks && <InfoRow label="Remarks" value={dossier.remarks} />}
            </CardContent>
          </Card>

          {/* Customer / Job Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer & Job Details</CardTitle></CardHeader>
            <CardContent>
              {dossier.job_cards && (
                <InfoRow
                  label="Job Card"
                  value={
                    <Link
                      href={`/job-cards/${dossier.job_cards.id}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {dossier.job_cards.jc_number}
                    </Link>
                  }
                />
              )}
              <InfoRow label="Customer Name"  value={dossier.customer_name} />
              <InfoRow label="PO Number"      value={dossier.po_number} />
              <InfoRow label="NBDN Number"    value={dossier.nbdn_number} />
              <InfoRow label="Drawing Number" value={dossier.drawing_number} />
              <InfoRow label="Heat Number"    value={dossier.heat_number} />
            </CardContent>
          </Card>

          {/* Submission Info */}
          {(dossier.submitted_to_customer || dossier.submitted_at) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Submission</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Submitted"    value={dossier.submitted_to_customer ? "Yes" : "No"} />
                <InfoRow label="Submitted At" value={fmtDate(dossier.submitted_at)} />
                <InfoRow label="Submitted By" value={dossier.submitted_by} />
              </CardContent>
            </Card>
          )}

          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Included Documents ({dossierDocs.filter((d) => d.included).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dossierDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents linked.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-3 text-xs">#</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-3 text-xs">Document</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-3 text-xs">Type</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-3 text-xs">Ver.</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 text-xs">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossierDocs
                        .filter((dd) => dd.included)
                        .map((dd, idx) => {
                          const doc = dd.document
                          const typeLabel = DOC_TYPE_LABELS[doc?.document_type ?? ""] ?? (doc?.document_type ?? "—")
                          const inactive = doc && !doc.is_active
                          return (
                            <tr
                              key={dd.id}
                              className={cn(
                                "border-b border-border/50",
                                inactive ? "opacity-50" : ""
                              )}
                            >
                              <td className="py-2 pr-3 text-xs text-muted-foreground">{idx + 1}</td>
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="text-xs font-medium truncate max-w-[180px]">
                                    {dd.document_name ?? doc?.document_name ?? doc?.file_name ?? "—"}
                                  </span>
                                  {inactive && <span className="text-[10px] text-destructive">(archived)</span>}
                                </div>
                              </td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{typeLabel}</td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground">v{dd.version ?? doc?.version ?? "?"}</td>
                              <td className="py-2 text-xs text-muted-foreground">{doc?.source_module ?? "—"}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions sidebar */}
        {canWrite && (
          <div>
            <Card className="sticky top-6">
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent>
                <DossierStatusActions
                  dossierId={id}
                  dossierStatus={dossier.status}
                  userRole={userRole}
                  generatedIndexPath={dossier.generated_index_pdf_path}
                  generatedZipPath={dossier.generated_zip_path}
                />
              </CardContent>
            </Card>
          </div>
        )}
        {!canWrite && (dossier.generated_index_pdf_path || dossier.generated_zip_path) && (
          <div>
            <Card className="sticky top-6">
              <CardHeader><CardTitle className="text-base">Downloads</CardTitle></CardHeader>
              <CardContent>
                <DossierStatusActions
                  dossierId={id}
                  dossierStatus={dossier.status}
                  userRole={userRole}
                  generatedIndexPath={dossier.generated_index_pdf_path}
                  generatedZipPath={dossier.generated_zip_path}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
