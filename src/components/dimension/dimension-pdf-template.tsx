// react-pdf/renderer template — runs server-side only (no "use client")
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { DimensionReport, DimensionRow } from "@/types/database"

const S = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 8, padding: 28, color: "#111" },
  // Header
  co:           { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 1 },
  coSub:        { fontSize: 7.5, textAlign: "center", marginBottom: 10, color: "#555" },
  reportTitle:  { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#374151", marginBottom: 6 },
  dividerLight: { borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", marginBottom: 4, marginTop: 2 },
  // Two-column header grid
  grid2:        { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 4 },
  field:        { width: "48%", flexDirection: "row", borderWidth: 0.5, borderColor: "#9ca3af" },
  fieldFull:    { width: "100%", flexDirection: "row", borderWidth: 0.5, borderColor: "#9ca3af", marginBottom: 2 },
  field3:       { width: "31.5%", flexDirection: "row", borderWidth: 0.5, borderColor: "#9ca3af" },
  label:        { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 80, fontSize: 7.5 },
  value:        { paddingHorizontal: 4, paddingVertical: 2, flex: 1, fontSize: 7.5 },
  labelWide:    { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 110, fontSize: 7.5 },
  // Section heading
  sectionHead:  { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#1e3a5f", color: "#fff", padding: "3 6", marginBottom: 3, marginTop: 6 },
  // Dimension table
  table:        { marginTop: 3, marginBottom: 6 },
  tHead:        { flexDirection: "row", backgroundColor: "#1e3a5f" },
  tRow:         { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tRowAlt:      { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", backgroundColor: "#f8f9ff" },
  tCell:        { paddingHorizontal: 3, paddingVertical: 2.5, borderRightWidth: 0.5, borderRightColor: "#e5e7eb", fontSize: 7, textAlign: "center" },
  tHeadCell:    { paddingHorizontal: 3, paddingVertical: 3, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 7, borderRightWidth: 0.5, borderRightColor: "#3b5c8a", textAlign: "center" },
  // Columns widths
  cNo:          { width: 22 },
  cName:        { width: 100 },
  cReqd:        { width: 54 },
  cTol:         { width: 45 },
  cAct:         { width: 40 },
  cPF:          { width: 30 },
  cRem:         { flex: 1 },
  // Result banner
  passBox:      { backgroundColor: "#dcfce7", padding: "4 8", borderRadius: 3, textAlign: "center", fontFamily: "Helvetica-Bold", color: "#15803d", marginTop: 4 },
  failBox:      { backgroundColor: "#fee2e2", padding: "4 8", borderRadius: 3, textAlign: "center", fontFamily: "Helvetica-Bold", color: "#991b1b", marginTop: 4 },
  holdBox:      { backgroundColor: "#fef9c3", padding: "4 8", borderRadius: 3, textAlign: "center", fontFamily: "Helvetica-Bold", color: "#854d0e", marginTop: 4 },
  // Signature
  sigRow:       { flexDirection: "row", gap: 16, marginTop: 14 },
  sigBox:       { flex: 1, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 3, textAlign: "center", fontSize: 7.5 },
  // Notes row
  noteRow:      { flexDirection: "row", marginTop: 4, fontSize: 7.5 },
  noteLabel:    { fontFamily: "Helvetica-Bold", marginRight: 4 },
})

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <View style={S.field}>
      <Text style={wide ? S.labelWide : S.label}>{label}</Text>
      <Text style={S.value}>{value ?? ""}</Text>
    </View>
  )
}

function Field3({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={S.field3}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value ?? ""}</Text>
    </View>
  )
}

function pfLabel(pf: string): string {
  if (pf === "pass") return "PASS"
  if (pf === "fail") return "FAIL"
  return "N/A"
}

export function DimensionPdfTemplate({ report }: { report: DimensionReport }) {
  const rawDims = report.dimensions
  const dims: DimensionRow[] = Array.isArray(rawDims)
    ? (rawDims as unknown as DimensionRow[])
    : []

  const date = report.report_date
    ? new Date(report.report_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : ""

  const resultStatus = report.result_status
  const resultBox = resultStatus === "accepted" ? S.passBox
    : resultStatus === "rejected" ? S.failBox
    : resultStatus === "hold"     ? S.holdBox
    : null

  const resultLabel = resultStatus === "accepted" ? "ACCEPTED"
    : resultStatus === "rejected" ? "REJECTED"
    : resultStatus === "hold"     ? "ON HOLD"
    : "PENDING"

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Company heading */}
        <Text style={S.co}>{report.vendor_name ?? "RR Engineering"}</Text>
        <Text style={S.coSub}>Quality Department</Text>
        <View style={S.divider} />
        <Text style={S.reportTitle}>Dimensional Inspection Report</Text>

        {/* Report header grid */}
        <View style={S.grid2}>
          <Field3 label="Report No."    value={report.report_number} />
          <Field3 label="Date"          value={date} />
          <Field3 label="Sample No."    value={report.sample_number} />
          <Field  label="Customer"      value={report.vendor_name ? undefined : "—"} />
          <Field  label="PO Number"     value={report.po_number} />
          <Field  label="Description"   value={report.description} />
          <Field  label="Drawing No."   value={report.drawing_number} />
          <Field  label="Drawing Rev."  value={report.drawing_revision} />
          <Field  label="Material Code" value={report.material_code} />
          <Field  label="Heat Number"   value={report.heat_number} />
          <Field  label="MP / DP No."   value={report.mp_dp_number} />
        </View>

        {/* Instrument */}
        <Text style={S.sectionHead}>Inspection Instrument</Text>
        <View style={S.grid2}>
          <Field label="Gauge / Instr." value={report.gauge_used ?? report.instrument_used} />
          <Field label="Visual Check"   value={report.visual_satisfactory === false ? "Not Satisfactory" : "Satisfactory"} />
        </View>

        {/* Dimension table */}
        <Text style={S.sectionHead}>Dimensional Inspection Details</Text>
        <View style={S.table}>
          {/* Table header */}
          <View style={S.tHead}>
            <Text style={[S.tHeadCell, S.cNo]}>S.No</Text>
            <Text style={[S.tHeadCell, S.cName]}>Characteristic</Text>
            <Text style={[S.tHeadCell, S.cReqd]}>Nominal</Text>
            <Text style={[S.tHeadCell, S.cTol]}>Tolerance</Text>
            <Text style={[S.tHeadCell, S.cAct]}>Actual 1</Text>
            <Text style={[S.tHeadCell, S.cAct]}>Actual 2</Text>
            <Text style={[S.tHeadCell, S.cAct]}>Actual 3</Text>
            <Text style={[S.tHeadCell, S.cPF]}>Pass/Fail</Text>
            <Text style={[S.tHeadCell, S.cRem]}>Remarks</Text>
          </View>
          {dims.map((d, i) => {
            const isAlt = i % 2 !== 0
            const rowStyle = isAlt ? S.tRowAlt : S.tRow
            const pfStyle = d.pass_fail === "pass"
              ? { color: "#15803d", fontFamily: "Helvetica-Bold" }
              : d.pass_fail === "fail"
              ? { color: "#991b1b", fontFamily: "Helvetica-Bold" }
              : {}
            return (
              <View key={i} style={rowStyle}>
                <Text style={[S.tCell, S.cNo]}>{i + 1}</Text>
                <Text style={[S.tCell, S.cName, { textAlign: "left" }]}>{d.dimension_name}</Text>
                <Text style={[S.tCell, S.cReqd]}>{d.required_dimension}</Text>
                <Text style={[S.tCell, S.cTol]}>{d.tolerance}</Text>
                <Text style={[S.tCell, S.cAct]}>{d.actual_value_1}</Text>
                <Text style={[S.tCell, S.cAct]}>{d.actual_value_2}</Text>
                <Text style={[S.tCell, S.cAct]}>{d.actual_value_3}</Text>
                <Text style={[S.tCell, S.cPF, pfStyle]}>{pfLabel(d.pass_fail ?? "na")}</Text>
                <Text style={[S.tCell, S.cRem, { textAlign: "left" }]}>{d.remarks}</Text>
              </View>
            )
          })}
          {dims.length === 0 && (
            <View style={S.tRow}>
              <Text style={[S.tCell, { flex: 1, textAlign: "left", color: "#9ca3af" }]}>No dimension rows.</Text>
            </View>
          )}
        </View>

        {/* Result banner */}
        {resultBox && (
          <View style={resultBox}>
            <Text>{resultLabel}</Text>
          </View>
        )}

        <View style={S.dividerLight} />

        {/* Inspected / approved by */}
        <View style={S.grid2}>
          <Field label="Inspector Name" value={report.inspected_by} />
          <Field label="Approved By"  value={report.approved_by ?? report.approved_by_name} />
        </View>

        {/* Signature area */}
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>Inspector Signature</Text>
            <Text style={{ marginTop: 18, fontSize: 7.5, color: "#6b7280" }}>
              {report.inspected_by ?? ""}
            </Text>
          </View>
          <View style={S.sigBox}>
            <Text>QA / Approver Signature</Text>
            <Text style={{ marginTop: 18, fontSize: 7.5, color: "#6b7280" }}>
              {report.approved_by ?? report.approved_by_name ?? ""}
            </Text>
          </View>
          <View style={S.sigBox}>
            <Text>Date</Text>
            <Text style={{ marginTop: 18, fontSize: 7.5, color: "#6b7280" }}>{date}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
