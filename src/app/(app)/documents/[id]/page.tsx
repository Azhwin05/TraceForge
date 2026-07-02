import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Info } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentCard } from "@/components/documents/document-card"
import { DocumentArchiveButton } from "@/components/documents/document-archive-button"
import { formatFileSize } from "@/lib/documents/storage-utils"
import { cn } from "@/lib/utils"
import type { Document, DocumentType, DocumentEntityType, UserRole } from "@/types/database"

export const metadata = { title: "Document — ValveTrack" }

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  wps_pdf:                "WPS PDF",
  pqr_pdf:                "PQR PDF",
  pmi_report:             "PMI Report",
  dimension_report:       "Dimension Report",
  pwht_chart:             "PWHT Chart",
  dispatch_doc:           "Dispatch Document",
  invoice:                "Invoice",
  calibration_cert:       "Calibration Certificate",
  customer_po:            "Customer PO",
  customer_drawing:       "Customer Drawing",
  job_card_pdf:           "Job Card PDF",
  overlay_welding_report: "Overlay Welding Report",
  annotated_drawing:      "Annotated Drawing",
  other:                  "Other",
  dossier_index:          "Dossier Index PDF",
  dossier_zip:            "Dossier ZIP Pack",
  welding_report:            "Welding Report",
  electrode_test_certificate: "Electrode Test Certificate",
  consumable_certificate:    "Consumable Certificate",
  material_test_certificate: "Material Test Certificate (MTC)",
  nde_report:                "NDT Report",
  lpt_report:                "LPT Report",
  hardness_report:           "Hardness Report",
  incoming_delivery_challan: "Incoming Delivery Challan",
  outgoing_delivery_challan: "Outgoing Delivery Challan",
  final_acceptance_document: "Final Acceptance Document",
  contract_review:           "Contract Review",
  process_layout:            "Process Layout",
}

const APPROVAL_BADGE: Record<string, { label: string; className: string }> = {
  none:     { label: "N/A",      className: "bg-gray-100 text-gray-600" },
  pending:  { label: "Pending",  className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
}

function getSourceLink(entityType: DocumentEntityType, entityId: string, jobCardId: string | null): { href: string; label: string } | null {
  switch (entityType) {
    case "pmi_report":        return { href: `/pmi-reports/${entityId}`, label: "Open PMI Report" }
    case "dimension_report":  return { href: `/dimension-reports/${entityId}`, label: "Open Dimension Report" }
    case "overlay_report":    return { href: `/overlay-reports/${entityId}`, label: "Open Overlay Welding Report" }
    case "wps_master":        return { href: `/master-data/wps/${entityId}`, label: "Open WPS Master" }
    case "instrument_master": return { href: `/master-data/instruments/${entityId}`, label: "Open Instrument" }
    case "pwht_run":          return { href: `/pwht-runs/${entityId}`, label: "Open PWHT Run" }
    case "job_card":          return { href: `/job-cards/${entityId}`, label: "Open Job Card" }
    case "dossier":           return { href: `/dossiers/${entityId}`, label: "Open Dossier" }
    case "wps_qualification":
      return jobCardId ? { href: `/job-cards/${jobCardId}`, label: "Open Job Card (WPS Qualification)" } : null
    case "dispatch":
      return jobCardId ? { href: `/job-cards/${jobCardId}`, label: "Open Job Card (Dispatch)" } : null
    default:                  return null
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  )
}

type DocWithJobCard = Document & {
  job_cards: { id: string; jc_number: string; po_number: string | null } | null
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await requireAuth()
  const supabase = await createClient()

  const { data: rawDoc } = await supabase
    .from("documents")
    .select("*, job_cards(id, jc_number, po_number)")
    .eq("id", id)
    .single()

  if (!rawDoc) notFound()

  const doc = rawDoc as DocWithJobCard
  const userRole = (profile?.role ?? "operator") as UserRole
  const isAdmin = userRole === "admin"

  const typeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type
  const approvalBadge = APPROVAL_BADGE[doc.approval_status] ?? APPROVAL_BADGE.none
  const sourceLink = getSourceLink(doc.entity_type, doc.entity_id, doc.job_card_id)

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link
          href="/documents"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Document Center
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold tracking-tight">
              {doc.document_name ?? doc.file_name}
            </h1>
          </div>
          {!doc.is_active && (
            <span className="rounded-full bg-destructive/10 text-destructive px-3 py-0.5 text-xs font-medium">
              Archived
            </span>
          )}
          {isAdmin && doc.is_active && (
            <DocumentArchiveButton documentId={doc.id} />
          )}
        </div>
      </div>

      {/* Download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">File</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentCard document={doc} />
          {!doc.storage_path && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              No storage path — this document may predate the file registry.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Document Type" value={typeLabel} />
          <InfoRow
            label="Category"
            value={
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                doc.document_category === "generated"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              )}>
                {doc.document_category === "generated" ? "Generated" : "Uploaded"}
              </span>
            }
          />
          <InfoRow
            label="Approval Status"
            value={
              <span className={cn("rounded-full px-2 py-0.5 text-xs", approvalBadge.className)}>
                {approvalBadge.label}
              </span>
            }
          />
          <InfoRow label="File Name" value={<span className="font-mono text-xs break-all">{doc.file_name}</span>} />
          <InfoRow label="File Size" value={doc.file_size ? formatFileSize(doc.file_size) : undefined} />
          <InfoRow label="MIME Type" value={<span className="font-mono text-xs">{doc.mime_type ?? "—"}</span>} />
          <InfoRow label="Version" value={`v${doc.version}${doc.is_latest ? " (latest)" : " (superseded)"}`} />
          <InfoRow label="Source Module" value={doc.source_module ?? undefined} />
          <InfoRow label="Uploaded" value={fmtDate(doc.uploaded_at)} />
          {doc.notes && <InfoRow label="Notes" value={doc.notes} />}
        </CardContent>
      </Card>

      {/* Links */}
      {(doc.job_cards || sourceLink) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {doc.job_cards && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Job Card</span>
                <Link
                  href={`/job-cards/${doc.job_card_id}`}
                  className="font-mono font-medium text-primary hover:underline"
                >
                  {doc.job_cards.jc_number}
                </Link>
              </div>
            )}
            {sourceLink && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Source Record</span>
                <Link href={sourceLink.href} className="text-primary hover:underline">
                  {sourceLink.label} →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
