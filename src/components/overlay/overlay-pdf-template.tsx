// react-pdf/renderer template — server-side only, no "use client"
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { OverlayReport, OverlayChemicalEntry } from "@/types/database"

const S = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 8, padding: 24, color: "#111" },
  title:        { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  subtitle:     { fontSize: 9, textAlign: "center", marginBottom: 6, color: "#444" },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#aaa", marginBottom: 6, marginTop: 2 },
  sectionHead:  { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#dbeafe", padding: "3 6", marginBottom: 3, marginTop: 4 },

  // Two-column grid
  grid2:        { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 3 },
  field:        { width: "48%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  fieldFull:    { width: "100%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db", marginBottom: 2 },
  label:        { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 96 },
  labelNarrow:  { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 72 },
  value:        { paddingHorizontal: 4, paddingVertical: 2, flex: 1 },

  // Table
  table:        { marginTop: 3, marginBottom: 6, borderWidth: 1, borderColor: "#d1d5db" },
  tableHeader:  { flexDirection: "row", backgroundColor: "#1e3a5f" },
  thCell:       { paddingHorizontal: 3, paddingVertical: 3, fontFamily: "Helvetica-Bold", color: "#fff", borderRightWidth: 1, borderRightColor: "#93c5fd", fontSize: 7 },
  tableRow:     { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  tableRowAlt:  { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f8faff" },
  tdCell:       { paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: 1, borderRightColor: "#e5e7eb", fontSize: 7 },

  // Result banner
  acceptedBanner: { backgroundColor: "#dcfce7", padding: "4 8", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#15803d", marginTop: 4 },
  rejectedBanner: { backgroundColor: "#fee2e2", padding: "4 8", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#991b1b", marginTop: 4 },
  holdBanner:     { backgroundColor: "#fef9c3", padding: "4 8", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#92400e", marginTop: 4 },

  // Sign-off
  sigRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  sigBox: { flex: 1, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 3, textAlign: "center" },

  // Result check row
  checkRow: { flexDirection: "row", gap: 10, marginTop: 3, marginBottom: 3 },
  checkOpt: { flexDirection: "row", alignItems: "center", gap: 3 },
  checkCircle: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: "#374151" },
  checkFill:   { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1e3a5f" },
})

function Field({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  const style = full ? S.fieldFull : S.field
  return (
    <View style={style}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value ?? ""}</Text>
    </View>
  )
}

function FieldNarrow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={S.field}>
      <Text style={S.labelNarrow}>{label}</Text>
      <Text style={S.value}>{value ?? ""}</Text>
    </View>
  )
}

function fmtDate(d?: string | null): string {
  if (!d) return ""
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const CHEM_COLS = [
  { key: "chemical_type", label: "Type",         width: 52 },
  { key: "chemical_name", label: "Chemical",      width: 90 },
  { key: "manufacturer",  label: "Manufacturer",  width: 80 },
  { key: "batch_no",      label: "Batch No.",     width: 60 },
  { key: "expiry_date",   label: "Expiry",        width: 52 },
]

export function OverlayPdfTemplate({ report }: { report: OverlayReport }) {
  const chemicals: OverlayChemicalEntry[] = Array.isArray(report.chemicals_used_json)
    ? (report.chemicals_used_json as unknown as OverlayChemicalEntry[])
    : []

  const res = report.result_status

  return (
    <Document title={`Overlay Welding Report — ${report.report_number ?? ""}`}>
      <Page size="A4" style={S.page}>

        {/* ── Company Header ── */}
        <Text style={S.title}>RAGHAV ENGINEERING</Text>
        <Text style={S.subtitle}>Overlay Welding Report — Customer Submission</Text>
        <View style={S.divider} />

        {/* ── Header Details ── */}
        <Text style={S.sectionHead}>Report Identification</Text>
        <View style={S.grid2}>
          <Field label="Report No."      value={report.report_number} />
          <Field label="Report Date"     value={fmtDate(report.report_date)} />
          <Field label="Vendor Name"     value={report.vendor_name} />
          <Field label="Vendor No."      value={report.vendor_number} />
          <Field label="Customer"        value={report.customer_name} />
          <Field label="PO / NBDN No."   value={[report.po_number, report.nbdn_number].filter(Boolean).join(" / ")} />
          <Field label="Material Code"   value={report.material_code} />
          <Field label="Drawing No."     value={report.drawing_number} />
          <Field label="WPS No."         value={report.wps_number} />
          <Field label="Process"         value={report.process} />
          <Field label="Item / Desc."    value={report.item_description} />
          <Field label="Quantity"        value={report.quantity} />
          <Field label="Base Mat. Grade" value={report.base_material_grade} />
          <Field label="Heat No."        value={report.heat_number} />
          <Field label="Test Coupon No." value={report.test_coupon_number} />
          <Field label="Dim. Report No." value={report.dimension_report_number} />
          <Field label="Job Card No."    value={report.job_card_number} />
          <Field label="Job Card Date"   value={fmtDate(report.job_card_date)} />
        </View>

        {/* ── Welding / Consumable ── */}
        <Text style={S.sectionHead}>Welding &amp; Consumable Details</Text>
        <View style={S.grid2}>
          <Field label="Welder Name"     value={report.welder_name} />
          <Field label="Date of Welding" value={fmtDate(report.date_of_welding)} />
          <Field label="Deposit Material" value={report.deposit_material} />
          <Field label="AWS Class No."   value={report.aws_class_number} />
          <Field label="Consumable Make" value={report.consumable_make} />
          <Field label="Batch No."       value={report.consumable_batch_number} />
          <Field label="HT Chart No."    value={report.heat_treatment_chart_number} />
          <Field label="Visual Exam."    value={report.visual_examination} />
        </View>

        {/* Hardness / Deposit Thickness */}
        <View style={S.grid2}>
          <FieldNarrow label="Hard. Reqd." value={report.hardness_required} />
          <FieldNarrow label="Hard. Actual" value={report.hardness_actual} />
          <FieldNarrow label="Dep. Cond."   value={report.deposit_thickness_condition} />
          <FieldNarrow label="Dep. Reqd."   value={report.deposit_thickness_required} />
          <FieldNarrow label="Dep. Actual"  value={report.deposit_thickness_actual} />
        </View>

        {/* ── LPT / NDE ── */}
        <Text style={S.sectionHead}>LPT / NDE Examination</Text>
        <View style={S.grid2}>
          <Field label="Procedure Ref."     value={report.lpt_procedure_ref} />
          <Field label="Type of Penetrant"  value={report.type_of_penetrant} />
          <Field label="Stage of Test"      value={report.stage_of_test} />
          <Field label="Surface Condition"  value={report.surface_condition} />
          <Field label="Penet. Application" value={report.penetrant_application} />
          <Field label="Penet. Removal"     value={report.penetrant_removal} />
          <Field label="Penet. Dwell Time"  value={report.penetrant_dwell_time} />
          <Field label="Temp. of Part"      value={report.temperature_of_part} />
          <Field label="Dev. Application"   value={report.developer_application} />
          <Field label="Dev. Dwell Time"    value={report.developer_dwell_time} />
          <Field label="Post Cleaning"      value={report.post_cleaning} />
        </View>
        {report.evaluation_of_dp_test && (
          <Field label="Evaluation of DP Test" value={report.evaluation_of_dp_test} full />
        )}

        {/* ── Chemicals Used ── */}
        {chemicals.length > 0 && (
          <>
            <Text style={S.sectionHead}>Chemicals Used</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                {CHEM_COLS.map((c) => (
                  <Text key={c.key} style={[S.thCell, { width: c.width }]}>{c.label}</Text>
                ))}
              </View>
              {chemicals.map((ch, i) => (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  {CHEM_COLS.map((c) => (
                    <Text key={c.key} style={[S.tdCell, { width: c.width }]}>
                      {ch[c.key as keyof OverlayChemicalEntry] ?? ""}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Result ── */}
        <Text style={S.sectionHead}>Result</Text>
        <View style={S.checkRow}>
          <View style={S.checkOpt}>
            <View style={res === "accepted" ? S.checkFill : S.checkCircle} />
            <Text>Accepted</Text>
          </View>
          <View style={S.checkOpt}>
            <View style={res === "rejected" ? S.checkFill : S.checkCircle} />
            <Text>Rejected</Text>
          </View>
          <View style={S.checkOpt}>
            <View style={res === "hold" ? S.checkFill : S.checkCircle} />
            <Text>On Hold</Text>
          </View>
        </View>
        <Text style={
          res === "accepted" ? S.acceptedBanner :
          res === "rejected" ? S.rejectedBanner :
          res === "hold"     ? S.holdBanner     :
          S.acceptedBanner
        }>
          {res === "accepted" ? "ACCEPTED" : res === "rejected" ? "REJECTED" : res === "hold" ? "ON HOLD" : "PENDING"}
        </Text>

        {/* ── Remarks ── */}
        {report.remarks && (
          <>
            <Text style={[S.sectionHead, { marginTop: 6 }]}>Remarks</Text>
            <View style={[S.fieldFull, { minHeight: 24 }]}>
              <Text style={[S.value, { flex: 1 }]}>{report.remarks}</Text>
            </View>
          </>
        )}

        {/* ── Signature Area ── */}
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>{report.inspected_by ?? ""}</Text>
            <Text>Inspected By</Text>
          </View>
          <View style={S.sigBox}>
            <Text>{report.approved_by ?? ""}</Text>
            <Text>Approved By / QC</Text>
          </View>
          <View style={S.sigBox}>
            <Text> </Text>
            <Text>Customer Witness</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={[S.divider, { marginTop: 10 }]} />
        <Text style={{ color: "#9ca3af", textAlign: "center", fontSize: 7 }}>
          Raghav Engineering · Overlay Welding Report · {fmtDate(report.report_date)}
          {report.report_number ? ` · ${report.report_number}` : ""}
        </Text>

      </Page>
    </Document>
  )
}
