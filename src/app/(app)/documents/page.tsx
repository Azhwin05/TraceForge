import Link from "next/link"
import { FileText, ChevronRight, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatFileSize } from "@/lib/documents/storage-utils"
import type { DocumentType, DocumentEntityType } from "@/types/database"

export const metadata = { title: "Document Center — ValveTrack" }

const PAGE_SIZE = 50

// ── Human-readable labels ─────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  wps_pdf:               "WPS PDF",
  pqr_pdf:               "PQR PDF",
  pmi_report:            "PMI Report",
  dimension_report:      "Dimension Report",
  pwht_chart:            "PWHT Chart",
  dispatch_doc:          "Dispatch Document",
  invoice:               "Invoice",
  calibration_cert:      "Calibration Certificate",
  customer_po:           "Customer PO",
  customer_drawing:      "Customer Drawing",
  job_card_pdf:          "Job Card PDF",
  overlay_welding_report: "Overlay Welding Report",
  annotated_drawing:     "Annotated Drawing",
  other:                 "Other",
  dossier_index:         "Dossier Index PDF",
  dossier_zip:           "Dossier ZIP Pack",
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
  rework_photo:              "Rework Photo",
}

const SOURCE_MODULE_LABELS: Record<string, string> = {
  pmi_report:        "PMI Reports",
  dimension_report:  "Dimension Reports",
  overlay_report:    "Overlay Reports",
  wps_master:        "WPS Master",
  instrument_master: "Instruments",
  pwht_run:          "PWHT Runs",
  dispatch:          "Dispatch",
  job_card:          "Job Cards",
  wps_qualification: "WPS Qualifications",
}

const CATEGORY_BADGE = {
  generated: { label: "Generated", className: "bg-blue-50 text-blue-700" },
  uploaded:  { label: "Uploaded",  className: "bg-gray-100 text-gray-700" },
} as const

// ── Source entity link ────────────────────────────────────────────────────────

function getSourceLink(entityType: DocumentEntityType, entityId: string, jobCardId: string | null): string | null {
  switch (entityType) {
    case "pmi_report":       return `/pmi-reports/${entityId}`
    case "dimension_report": return `/dimension-reports/${entityId}`
    case "overlay_report":   return `/overlay-reports/${entityId}`
    case "wps_master":       return `/master-data/wps/${entityId}`
    case "instrument_master":return `/master-data/instruments/${entityId}`
    case "pwht_run":         return `/pwht-runs/${entityId}`
    case "job_card":         return `/job-cards/${entityId}`
    case "dossier":          return `/dossiers/${entityId}`
    case "wps_qualification":
    case "dispatch":
      return jobCardId ? `/job-cards/${jobCardId}` : null
    default:                 return null
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SearchParams = {
  q?: string
  type?: string
  category?: string
  module?: string
  status?: string
  latest?: string    // "1" = latest only (default), "0" = all versions
  active?: string    // "1" = active only (default)
  page?: string
}

type DocRow = {
  id: string
  document_name: string | null
  file_name: string
  document_type: DocumentType
  document_category: "uploaded" | "generated"
  source_module: string | null
  entity_type: DocumentEntityType
  entity_id: string
  job_card_id: string | null
  version: number
  is_latest: boolean
  is_active: boolean
  approval_status: "none" | "pending" | "approved" | "rejected"
  file_size: number | null
  uploaded_at: string
  job_cards: { jc_number: string; po_number: string | null; drawing_number: string | null; heat_number: string | null } | null
}

export default async function DocumentCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  await requireAuth()
  const supabase = await createClient()

  const q       = sp.q?.trim() ?? ""
  const typeF   = sp.type ?? ""
  const catF    = sp.category ?? ""
  const modF    = sp.module ?? ""
  const statusF = sp.status ?? ""
  const latestF = sp.latest !== "0"  // default: latest only
  const activeF = sp.active !== "0"  // default: active only
  const page    = Math.max(0, parseInt(sp.page ?? "0", 10) || 0)
  const offset  = page * PAGE_SIZE

  // Build query
  let query = supabase
    .from("documents")
    .select("id, document_name, file_name, document_type, document_category, source_module, entity_type, entity_id, job_card_id, version, is_latest, is_active, approval_status, file_size, uploaded_at, job_cards(jc_number, po_number, drawing_number, heat_number)")
    .order("uploaded_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (activeF)  query = query.eq("is_active", true)
  if (latestF)  query = query.eq("is_latest", true)
  if (typeF)    query = query.eq("document_type", typeF as DocumentType)
  if (catF)     query = query.eq("document_category", catF as "uploaded" | "generated")
  if (modF)     query = query.eq("source_module", modF)
  if (statusF)  query = query.eq("approval_status", statusF as "none" | "pending" | "approved" | "rejected")

  // Text search on document fields
  if (q) {
    // Search document_name OR file_name (ILIKE)
    query = query.or(`document_name.ilike.%${q}%,file_name.ilike.%${q}%`)
  }

  const { data: rawDocs } = await query
  const docs = (rawDocs ?? []) as DocRow[]

  const hasMore = docs.length === PAGE_SIZE
  const hasPrev = page > 0

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Document Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All uploaded and generated documents across every module
        </p>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <form className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex items-center gap-1.5 border border-input rounded-md px-2.5 h-8 bg-background w-56">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Name, file name…"
                className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Document Type */}
            <select
              name="type"
              defaultValue={typeF}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All types</option>
              {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Category */}
            <select
              name="category"
              defaultValue={catF}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All categories</option>
              <option value="generated">Generated</option>
              <option value="uploaded">Uploaded</option>
            </select>

            {/* Source module */}
            <select
              name="module"
              defaultValue={modF}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All modules</option>
              {Object.entries(SOURCE_MODULE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Approval status */}
            <select
              name="status"
              defaultValue={statusF}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="none">No approval</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Latest toggle */}
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name="latest"
                value="1"
                defaultChecked={latestF}
                className="accent-primary"
              />
              Latest only
            </label>

            <button
              type="submit"
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Filter
            </button>

            {(q || typeF || catF || modF || statusF || !latestF) && (
              <a href="/documents" className="h-8 px-3 rounded-md border border-input bg-background text-sm flex items-center text-muted-foreground hover:text-foreground">
                Clear
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documents {docs.length > 0 && `(${docs.length}${hasMore ? "+" : ""})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No documents found.</p>
              {(q || typeF || catF || modF || statusF) && (
                <a href="/documents" className="text-sm text-primary hover:underline">Clear filters</a>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Document</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Type</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Category</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Job Card</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Size</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Date</th>
                    <th className="text-left font-medium text-muted-foreground pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => {
                    const catBadge = CATEGORY_BADGE[doc.document_category] ?? CATEGORY_BADGE.uploaded
                    const typeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type
                    const jc = doc.job_cards
                    const sourceLink = getSourceLink(doc.entity_type, doc.entity_id, doc.job_card_id)
                    return (
                      <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="font-medium line-clamp-1">
                                {doc.document_name ?? doc.file_name}
                              </span>
                              {doc.document_name && doc.file_name !== doc.document_name && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.file_name}</p>
                              )}
                              {!doc.is_latest && (
                                <span className="text-xs text-muted-foreground">v{doc.version} (old)</span>
                              )}
                              {doc.is_latest && doc.version > 1 && (
                                <span className="text-xs text-muted-foreground">v{doc.version}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                          {typeLabel}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs", catBadge.className)}>
                            {catBadge.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs">
                          {jc ? (
                            <Link
                              href={`/job-cards/${doc.job_card_id}`}
                              className="font-mono text-primary hover:underline"
                            >
                              {jc.jc_number}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                          {doc.file_size ? formatFileSize(doc.file_size) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(doc.uploaded_at)}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            {sourceLink && (
                              <Link
                                href={sourceLink}
                                className="text-xs text-muted-foreground hover:text-foreground"
                                title="Open source"
                              >
                                Source
                              </Link>
                            )}
                            <Link
                              href={`/documents/${doc.id}`}
                              className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                            >
                              Details <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(hasPrev || hasMore) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page + 1}{hasMore ? "+" : ""}
              </span>
              <div className="flex gap-2">
                {hasPrev && (
                  <Link
                    href={`/documents?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]), page: String(page - 1) })}`}
                    className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                  >
                    ← Previous
                  </Link>
                )}
                {hasMore && (
                  <Link
                    href={`/documents?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]), page: String(page + 1) })}`}
                    className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
