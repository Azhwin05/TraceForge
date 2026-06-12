// Server-side only — do not add "use client"
import { createElement, type ReactElement } from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { CustomerDossier, DossierDocument } from "@/types/database"

const s = StyleSheet.create({
  page:   { fontFamily: "Helvetica", fontSize: 9, padding: 36, color: "#1a1a1a" },
  // Header
  hdrBox:  { backgroundColor: "#1e3a5f", borderRadius: 4, padding: "10 14", marginBottom: 12 },
  hdrTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 1 },
  hdrSub:   { fontSize: 9, color: "#a0bcd8", marginTop: 2 },
  // Dossier identity strip
  stripBox:  { backgroundColor: "#f0f4f8", borderRadius: 3, padding: "6 10", marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  stripLabel: { fontSize: 8, color: "#5a7a9a", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  stripVal:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a5f" },
  // Section
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#5a7a9a", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, marginTop: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 6 },
  // Info grid
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  infoCell: { width: "50%", padding: "3 0" },
  infoLabel: { fontSize: 7.5, color: "#64748b", fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 1 },
  infoVal:   { fontSize: 9, color: "#1a1a1a" },
  // Documents table
  tHead:    { flexDirection: "row", backgroundColor: "#1e3a5f", borderRadius: "2 2 0 0" },
  tRow:     { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tRowAlt:  { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  tHdrCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#ffffff", padding: "4 6" },
  tCell:    { fontSize: 8, color: "#1a1a1a", padding: "4 6" },
  // Footer
  footer:   { position: "absolute", bottom: 28, left: 36, right: 36, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerLabel: { fontSize: 7, color: "#94a3b8", fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 3 },
  footerVal:  { fontSize: 8, color: "#1a1a1a", minHeight: 16, borderBottomWidth: 1, borderBottomColor: "#cbd5e1", width: 100 },
  footerSigBox: { width: "30%", paddingRight: 12 },
  pageNum:  { position: "absolute", bottom: 12, right: 36, fontSize: 7, color: "#94a3b8" },
})

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
  dossier_index:          "Dossier Index",
  other:                  "Other",
}

const SOURCE_LABELS: Record<string, string> = {
  overlay_report:    "Overlay Welding",
  pmi_report:        "PMI Inspection",
  dimension_report:  "Dimension Inspection",
  pwht_run:          "PWHT",
  wps_master:        "WPS Master",
  wps_qualification: "WPS Qual.",
  dispatch:          "Dispatch",
  instrument_master: "Instrument",
  job_card:          "Job Card",
}

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  return createElement(
    View,
    { style: s.infoCell },
    createElement(Text, { style: s.infoLabel }, label),
    createElement(Text, { style: s.infoVal }, value ?? "—"),
  )
}

type Props = {
  dossier: CustomerDossier
  dossierDocs: (DossierDocument & {
    document: { document_type: string; document_name: string | null; file_name: string; source_module: string | null; version: number; approval_status: string }
  })[]
  jcNumber?: string
}

export function DossierIndexPdf({ dossier, dossierDocs, jcNumber }: Props): ReactElement<unknown> {
  const includedDocs = dossierDocs.filter((dd) => dd.included).sort((a, b) => a.sort_order - b.sort_order)

  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: s.page },

      // ── Company Header ────────────────────────────────────────────────────
      createElement(
        View, { style: s.hdrBox },
        createElement(Text, { style: s.hdrTitle }, "RAGHAV ENGINEERING"),
        createElement(Text, { style: s.hdrSub }, "CUSTOMER SUBMISSION DOSSIER"),
      ),

      // ── Dossier identity ──────────────────────────────────────────────────
      createElement(
        View, { style: s.stripBox },
        createElement(
          View,
          {},
          createElement(Text, { style: s.stripLabel }, "Dossier No."),
          createElement(Text, { style: s.stripVal }, dossier.dossier_number),
        ),
        createElement(
          View, { style: { alignItems: "flex-end" } },
          createElement(Text, { style: s.stripLabel }, "Date"),
          createElement(Text, { style: s.stripVal }, dossier.dossier_date),
        ),
      ),

      // ── Job & Customer Details ────────────────────────────────────────────
      createElement(Text, { style: s.sectionTitle }, "Job & Customer Details"),
      createElement(View, { style: s.divider }),
      createElement(
        View, { style: s.infoGrid },
        createElement(InfoCell, { label: "Job Card No.", value: jcNumber }),
        createElement(InfoCell, { label: "Customer", value: dossier.customer_name }),
        createElement(InfoCell, { label: "PO Number", value: dossier.po_number }),
        createElement(InfoCell, { label: "NBDN Number", value: dossier.nbdn_number }),
        createElement(InfoCell, { label: "Drawing No.", value: dossier.drawing_number }),
        createElement(InfoCell, { label: "Heat No.", value: dossier.heat_number }),
      ),

      // ── Document List ─────────────────────────────────────────────────────
      createElement(Text, { style: { ...s.sectionTitle, marginTop: 14 } }, "Included Documents"),
      createElement(View, { style: s.divider }),

      // Table header
      createElement(
        View, { style: s.tHead },
        createElement(Text, { style: { ...s.tHdrCell, width: "5%" } }, "#"),
        createElement(Text, { style: { ...s.tHdrCell, width: "40%" } }, "Document Name"),
        createElement(Text, { style: { ...s.tHdrCell, width: "25%" } }, "Document Type"),
        createElement(Text, { style: { ...s.tHdrCell, width: "10%" } }, "Ver."),
        createElement(Text, { style: { ...s.tHdrCell, width: "20%" } }, "Source"),
      ),
      // Table rows
      ...includedDocs.map((dd, idx) =>
        createElement(
          View,
          { key: dd.id, style: idx % 2 === 0 ? s.tRow : s.tRowAlt },
          createElement(Text, { style: { ...s.tCell, width: "5%", color: "#64748b" } }, String(idx + 1)),
          createElement(Text, { style: { ...s.tCell, width: "40%" } },
            dd.document_name ?? dd.document?.document_name ?? dd.document?.file_name ?? "—",
          ),
          createElement(Text, { style: { ...s.tCell, width: "25%", color: "#334155" } },
            DOC_TYPE_LABELS[dd.document?.document_type ?? ""] ?? (dd.document?.document_type ?? "—"),
          ),
          createElement(Text, { style: { ...s.tCell, width: "10%", color: "#64748b" } },
            dd.document?.version ? `v${dd.document.version}` : "—",
          ),
          createElement(Text, { style: { ...s.tCell, width: "20%", color: "#64748b" } },
            SOURCE_LABELS[dd.document?.source_module ?? ""] ?? (dd.document?.source_module ?? "—"),
          ),
        )
      ),

      // ── Sign-off note ─────────────────────────────────────────────────────
      includedDocs.length === 0
        ? createElement(Text, { style: { fontSize: 8, color: "#94a3b8", marginTop: 8 } }, "No documents included.")
        : null,

      // ── Remarks ───────────────────────────────────────────────────────────
      dossier.remarks
        ? createElement(
            View, { style: { marginTop: 12 } },
            createElement(Text, { style: s.sectionTitle }, "Remarks"),
            createElement(View, { style: s.divider }),
            createElement(Text, { style: { fontSize: 8.5, lineHeight: 1.5 } }, dossier.remarks),
          )
        : null,

      // ── Footer ────────────────────────────────────────────────────────────
      createElement(
        View, { style: s.footer },
        createElement(
          View, { style: s.footerRow },
          createElement(
            View, { style: s.footerSigBox },
            createElement(Text, { style: s.footerLabel }, "Prepared By"),
            createElement(Text, { style: s.footerVal }, dossier.prepared_by ?? ""),
          ),
          createElement(
            View, { style: s.footerSigBox },
            createElement(Text, { style: s.footerLabel }, "Approved By"),
            createElement(Text, { style: s.footerVal }, dossier.approved_by ?? ""),
          ),
          createElement(
            View, { style: s.footerSigBox },
            createElement(Text, { style: s.footerLabel }, "Date"),
            createElement(Text, { style: s.footerVal }, dossier.dossier_date),
          ),
        ),
      ),
      createElement(Text, { style: s.pageNum, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
    ),
  ) as ReactElement<unknown>
}
