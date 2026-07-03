import Link from "next/link"
import { FileText, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentCard } from "@/components/documents/document-card"
import { cn } from "@/lib/utils"
import type { Document, DocumentType, DocumentEntityType } from "@/types/database"

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

function getSourceLink(entityType: DocumentEntityType, entityId: string): string | null {
  switch (entityType) {
    case "pmi_report":        return `/pmi-reports/${entityId}`
    case "dimension_report":  return `/dimension-reports/${entityId}`
    case "overlay_report":    return `/overlay-reports/${entityId}`
    case "wps_master":        return `/master-data/wps/${entityId}`
    case "instrument_master": return `/master-data/instruments/${entityId}`
    case "pwht_run":          return `/pwht-runs/${entityId}`
    default:                  return null
  }
}

type Props = {
  documents: Document[]
}

export function JobCardDocumentsSection({ documents }: Props) {
  if (documents.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> All Documents ({documents.length})
          </CardTitle>
          <Link
            href={`/documents?latest=1&q=${encodeURIComponent("")}`}
            className="flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            View in Document Center <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => {
            const typeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type
            const sourceLink = getSourceLink(doc.entity_type, doc.entity_id)
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/20"
              >
                {/* Type badge */}
                <span className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                  doc.document_category === "generated"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                )}>
                  {typeLabel}
                </span>

                {/* Download (compact) */}
                <div className="flex-1 min-w-0">
                  <DocumentCard document={doc} compact />
                </div>

                {/* Version */}
                {doc.version > 1 && (
                  <span className="shrink-0 text-xs text-muted-foreground">v{doc.version}</span>
                )}

                {/* Source link */}
                {sourceLink ? (
                  <Link
                    href={sourceLink}
                    className="shrink-0 text-xs text-muted-foreground hover:text-primary"
                    title="Open source record"
                  >
                    Source
                  </Link>
                ) : (
                  <Link
                    href={`/documents/${doc.id}`}
                    className="shrink-0 text-xs text-muted-foreground hover:text-primary"
                  >
                    Details
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
