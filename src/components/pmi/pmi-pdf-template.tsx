// react-pdf/renderer template — runs server-side only (no "use client")
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import type { PmiReport, PmiReadings } from "@/types/database"

const S = StyleSheet.create({
  page:          { fontFamily: "Helvetica", fontSize: 8, padding: 28, color: "#111" },
  title:         { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  subtitle:      { fontSize: 8, textAlign: "center", marginBottom: 8, color: "#444" },
  sectionHead:   { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#dbeafe", padding: "3 6", marginBottom: 2 },
  divider:       { borderBottomWidth: 1, borderBottomColor: "#ccc", marginBottom: 6, marginTop: 2 },
  // Two-column header grid
  grid2:         { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 4 },
  field:         { width: "48%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  field3col:     { width: "31.5%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  label:         { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 82 },
  value:         { paddingHorizontal: 4, paddingVertical: 2, flex: 1 },
  // Readings table
  table:         { marginTop: 4, marginBottom: 8 },
  tableHeader:   { flexDirection: "row", backgroundColor: "#1e3a5f", color: "#fff" },
  tableHeaderCell: { paddingHorizontal: 3, paddingVertical: 3, fontFamily: "Helvetica-Bold", color: "#fff", borderRightWidth: 1, borderRightColor: "#93c5fd", textAlign: "center" },
  tableRow:      { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableRowAlt:   { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#f8faff" },
  tableCell:     { paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: 1, borderRightColor: "#e5e7eb", textAlign: "center" },
  // Evaluation
  evalBox:       { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 4 },
  evalOption:    { flexDirection: "row", alignItems: "center", gap: 3 },
  evalCircle:    { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: "#374151" },
  evalCircleFill: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1e3a5f" },
  // Signature
  sigRow:        { flexDirection: "row", gap: 16, marginTop: 8 },
  sigBox:        { flex: 1, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 3, textAlign: "center" },
  // Result banner
  acceptedBanner: { backgroundColor: "#dcfce7", padding: "4 8", borderRadius: 3, textAlign: "center", fontFamily: "Helvetica-Bold", color: "#15803d" },
  rejectedBanner: { backgroundColor: "#fee2e2", padding: "4 8", borderRadius: 3, textAlign: "center", fontFamily: "Helvetica-Bold", color: "#991b1b" },
  // drawing
  drawingBox:    { borderWidth: 1, borderColor: "#d1d5db", marginTop: 4, marginBottom: 4, minHeight: 80 },
})

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={S.field}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value ?? ""}</Text>
    </View>
  )
}

function fmt(n: number | null | undefined): string {
  if (n == null) return ""
  return n.toFixed(2)
}

const COL_WIDTHS = { loc: 56, heat: 40, reading: 36, pct: 28 }

export function PmiPdfTemplate({ report, signedDrawingUrl }: {
  report: PmiReport
  signedDrawingUrl?: string | null
}) {
  const raw = report.readings
  const readings: PmiReadings = Array.isArray(raw) ? (raw as unknown as PmiReadings) : []
  const date = report.report_date
    ? new Date(report.report_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : ""

  return (
    <Document title={`PMI Report — ${report.report_number ?? ""}`}>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <Text style={S.title}>RAGHAV ENGINEERING</Text>
        <Text style={S.subtitle}>PMI (Positive Material Identification) Report</Text>
        <View style={S.divider} />

        {/* Report Identity */}
        <View style={S.grid2}>
          <Field label="Report No." value={report.report_number} />
          <Field label="Date" value={date} />
          <Field label="Customer" value={report.customer} />
          <Field label="Order / PO No." value={report.order_number} />
          <Field label="Item No." value={report.item_no} />
          <Field label="Quantity" value={report.quantity} />
          <Field label="Valve Size & Class" value={report.valve_size_class} />
          <Field label="Valve Type / Comp." value={report.valve_type_component} />
          <Field label="Base Material" value={report.base_material} />
          <Field label="Overlay Material" value={report.overlay_material} />
          <Field label="Drawing No." value={report.drawing_number} />
          <Field label="Procedure Ref." value={report.procedure_ref} />
          <Field label="Heat No." value={report.heat_no} />
          <Field label="Inspected By" value={report.inspected_by} />
        </View>

        {/* Instrument */}
        <Text style={S.sectionHead}>Instrument Details</Text>
        <View style={S.grid2}>
          <Field label="Instrument" value={report.instrument_name} />
          <Field label="Serial No." value={report.instrument_serial} />
          <Field label="Calibration Due" value={report.calibration_due} />
        </View>

        {/* Annotated Drawing */}
        {(signedDrawingUrl || report.annotated_drawing_path) && (
          <>
            <Text style={S.sectionHead}>Annotated Drawing</Text>
            {signedDrawingUrl ? (
              <View style={S.drawingBox}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={signedDrawingUrl} style={{ maxHeight: 160 }} />
              </View>
            ) : (
              <View style={[S.drawingBox, { justifyContent: "center", alignItems: "center" }]}>
                <Text style={{ color: "#9ca3af" }}>Drawing attached separately</Text>
              </View>
            )}
          </>
        )}

        {/* Readings Table */}
        <Text style={S.sectionHead}>PMI Readings</Text>
        <View style={S.table}>
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCell, { width: COL_WIDTHS.loc }]}>Location</Text>
            <Text style={[S.tableHeaderCell, { width: COL_WIDTHS.heat }]}>Heat No.</Text>
            <Text style={[S.tableHeaderCell, { width: COL_WIDTHS.reading }]}>Reading</Text>
            {(["Ni %", "Cr %", "Mo %", "Fe %", "Nb %", "Ti %"] as const).map((h) => (
              <Text key={h} style={[S.tableHeaderCell, { width: COL_WIDTHS.pct }]}>{h}</Text>
            ))}
          </View>

          {readings.flatMap((loc, li) =>
            loc.items.map((item, ri) => (
              <View key={`${li}-${ri}`} style={(li + ri) % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tableCell, { width: COL_WIDTHS.loc }]}>{ri === 0 ? loc.location_name : ""}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.heat }]}>{ri === 0 ? (loc.heat_no ?? "") : ""}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.reading }]}>{item.reading_no}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.pct }]}>{fmt(item.ni)}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.pct }]}>{fmt(item.cr)}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.pct }]}>{fmt(item.mo)}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.pct }]}>{fmt(item.fe)}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.pct }]}>{fmt(item.nb)}</Text>
                <Text style={[S.tableCell, { width: COL_WIDTHS.pct }]}>{fmt(item.ti)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Evaluation */}
        <Text style={S.sectionHead}>Evaluation of Results</Text>
        <View style={S.evalBox}>
          <View style={S.evalOption}>
            <View style={report.result === "acceptable" ? S.evalCircleFill : S.evalCircle} />
            <Text>Accepted</Text>
          </View>
          <View style={S.evalOption}>
            <View style={report.result === "not_acceptable" ? S.evalCircleFill : S.evalCircle} />
            <Text>Not Accepted</Text>
          </View>
        </View>
        <Text style={report.result === "acceptable" ? S.acceptedBanner : S.rejectedBanner}>
          {report.result === "acceptable" ? "ACCEPTED" : "NOT ACCEPTED"}
        </Text>

        {/* Signature Area */}
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>{report.inspected_by ?? ""}</Text>
            <Text>Inspected By</Text>
          </View>
          <View style={S.sigBox}>
            <Text>{report.approved_by_name ?? ""}</Text>
            <Text>Approved By</Text>
          </View>
          <View style={S.sigBox}>
            <Text> </Text>
            <Text>Customer Witness</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[S.divider, { marginTop: 12 }]} />
        <Text style={{ color: "#9ca3af", textAlign: "center", fontSize: 7 }}>
          Raghav Engineering · PMI Report · {date}
          {report.report_number ? ` · ${report.report_number}` : ""}
        </Text>
      </Page>
    </Document>
  )
}
