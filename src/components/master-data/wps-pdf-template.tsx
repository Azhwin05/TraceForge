// react-pdf/renderer template — server-side only, no "use client"
import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { WpsMaster, WeldPassRow, TensileTestRow } from "@/types/database"

const S = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 8, padding: 24, color: "#111" },
  title:        { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  subtitle:     { fontSize: 9, textAlign: "center", marginBottom: 6, color: "#444" },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#aaa", marginBottom: 6, marginTop: 2 },
  sectionHead:  { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#e0e7ff", padding: "3 6", marginBottom: 3, marginTop: 6 },

  grid2:        { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 3 },
  field:        { width: "48%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  fieldThird:   { width: "31.5%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  fieldFull:    { width: "100%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db", marginBottom: 2 },
  label:        { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 110 },
  value:        { paddingHorizontal: 4, paddingVertical: 2, flex: 1 },

  table:        { marginTop: 3, marginBottom: 6, borderWidth: 1, borderColor: "#d1d5db" },
  tableHeader:  { flexDirection: "row", backgroundColor: "#3730a3" },
  thCell:       { paddingHorizontal: 3, paddingVertical: 3, fontFamily: "Helvetica-Bold", color: "#fff", borderRightWidth: 1, borderRightColor: "#a5b4fc", fontSize: 6 },
  tableRow:     { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  tableRowAlt:  { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f5f5ff" },
  tdCell:       { paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: 1, borderRightColor: "#e5e7eb", fontSize: 6 },

  sigRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  sigBox: { flex: 1, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 3, textAlign: "center" },
})

function Field({ label, value, width = "field" }: {
  label: string; value?: string | number | null; width?: "field" | "third" | "full"
}) {
  const style = width === "full" ? S.fieldFull : width === "third" ? S.fieldThird : S.field
  return (
    <View style={style}>
      <Text style={S.label}>{label}</Text>
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

const PASS_COLS = [
  { key: "pass_label",            label: "Weld Pass",    width: 75 },
  { key: "process",               label: "Process",      width: 45 },
  { key: "filler_classification", label: "Filler Class.", width: 60 },
  { key: "filler_diameter",       label: "Dia.",          width: 40 },
  { key: "current_type_polarity", label: "Current/Pol.",  width: 55 },
  { key: "amps_range",            label: "Amps",          width: 45 },
  { key: "volts_range",           label: "Volts",         width: 40 },
  { key: "travel_speed_range",    label: "Travel Speed",  width: 55 },
  { key: "heat_input",            label: "Heat Input",    width: 50 },
] as const

const TENSILE_COLS = [
  { key: "specimen_no",           label: "Specimen",  width: 45 },
  { key: "width",                 label: "Width",     width: 45 },
  { key: "thickness",             label: "Thickness", width: 50 },
  { key: "area",                  label: "Area (mm²)", width: 55 },
  { key: "ultimate_load",         label: "Ult. Load (KN)", width: 60 },
  { key: "ultimate_stress",       label: "Ult. Stress (MPa)", width: 65 },
  { key: "failure_type_location", label: "Failure Type / Location", width: 130 },
] as const

export function WpsMasterPdfTemplate({ wps }: { wps: WpsMaster }) {
  const gas    = (wps.gas_json               ?? {}) as Record<string, string>
  const elec   = (wps.electrical_params_json ?? {}) as Record<string, string>
  const tech   = (wps.technique_json         ?? {}) as Record<string, string>
  const joint  = (wps.joint_json             ?? {}) as Record<string, string>
  const base   = (wps.base_metal_json        ?? {}) as Record<string, string>
  const filler = (wps.filler_metal_json      ?? {}) as Record<string, string>
  const weldPasses: WeldPassRow[]     = wps.weld_passes_json     ?? []
  const tensileTests: TensileTestRow[] = wps.tensile_tests_json  ?? []

  return (
    <Document title={`WPS — ${wps.wps_no}`}>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>RAGHAV ENGINEERING</Text>
        <Text style={S.subtitle}>
          Welding Procedure Specification (WPS) — In Accordance with ASME Section IX
        </Text>
        <View style={S.divider} />

        {/* Basic Information */}
        <Text style={S.sectionHead}>Basic Information</Text>
        <View style={S.grid2}>
          <Field label="WPS No."          value={wps.wps_no} />
          <Field label="PQR No."          value={wps.pqr_no} />
          <Field label="Welding Process"  value={wps.welding_process} />
          <Field label="Type"             value={wps.type} />
          <Field label="Revision"         value={wps.revision} />
          <Field label="Effective Date"   value={fmtDate(wps.effective_date)} />
          <Field label="Date of Welding"  value={fmtDate(wps.date_of_welding)} />
        </View>
        {wps.scope && <Field label="Scope" value={wps.scope} width="full" />}

        {/* Joints (QW-402) */}
        <Text style={S.sectionHead}>Joints (QW-402)</Text>
        <View style={S.grid2}>
          <Field label="Groove Type"    value={wps.joint_design} />
          <Field label="Root Gap"       value={joint.root_gap} />
          <Field label="Root Face"      value={joint.root_face} />
          <Field label="Groove Angle"   value={joint.groove_angle} />
          <Field label="Groove Length"  value={joint.groove_length} />
          <Field label="Groove Width"   value={joint.groove_width} />
          <Field label="Backing"        value={joint.backing} />
          <Field label="Retainer"       value={joint.retainer} />
        </View>

        {/* Base Metals (QW-403) */}
        <Text style={S.sectionHead}>Base Metals (QW-403)</Text>
        <View style={S.grid2}>
          <Field label="Material Spec."     value={base.material_spec} />
          <Field label="Type or Grade"      value={base.type_grade} />
          <Field label="P.No."              value={base.p_no} />
          <Field label="Heat No."           value={base.heat_no} />
          <Field label="Test Coupon Thk."   value={base.test_coupon_thickness} />
          <Field label="Test Coupon Dia."   value={base.test_coupon_diameter} />
          <Field label="Base Material"      value={wps.base_material} />
        </View>

        {/* Filler Metals (QW-404) */}
        <Text style={S.sectionHead}>Filler Metals (QW-404)</Text>
        <View style={S.grid2}>
          <Field label="SFA Spec."       value={filler.sfa_spec} />
          <Field label="AWS Class."      value={wps.filler_aws_class} />
          <Field label="Filler F.No."    value={filler.f_no} />
          <Field label="Weld Metal A.No." value={filler.a_no} />
          <Field label="Filler Size"     value={wps.filler_size} />
          <Field label="Feed Rate"       value={filler.feed_rate} />
          <Field label="Weld Metal Thk." value={filler.weld_metal_thickness} />
          <Field label="Filler Material" value={wps.filler_material} />
        </View>

        {/* Position (QW-405) */}
        <Text style={S.sectionHead}>Position (QW-405)</Text>
        <View style={S.grid2}>
          <Field label="Position of Groove" value={wps.position} />
          <Field label="Weld Progression"   value={wps.weld_progression} />
        </View>

        {/* Preheat (QW-406) */}
        <Text style={S.sectionHead}>Preheat (QW-406)</Text>
        <View style={S.grid2}>
          <Field label="Preheat Temp."   value={wps.preheat_min != null ? `${wps.preheat_min} °C` : null} />
          <Field label="Interpass Temp." value={wps.interpass_max != null ? `${wps.interpass_max} °C` : null} />
          <Field label="Others"          value={wps.preheat_other} />
        </View>

        {/* PWHT (QW-407) */}
        <Text style={S.sectionHead}>Post Weld Heat Treatment (QW-407)</Text>
        <View style={S.grid2}>
          <Field label="PWHT Required" value={wps.pwht_required ? "Yes" : "No"} />
          {wps.pwht_required && (
            <>
              <Field label="Temperature"    value={
                wps.pwht_temp_min != null || wps.pwht_temp_max != null
                  ? `${wps.pwht_temp_min ?? "—"} – ${wps.pwht_temp_max ?? "—"} °C` : null
              } />
              <Field label="Time Range"           value={wps.pwht_time_range} />
              <Field label="Cooling"              value={wps.pwht_cooling_method} />
              <Field label="Rate of Heating"       value={wps.pwht_rate_of_heating} />
              <Field label="Loading Temp."         value={wps.pwht_loading_temp} />
              <Field label="Unloading Temp."       value={wps.pwht_unloading_temp} />
            </>
          )}
        </View>

        {/* Gas (QW-408) */}
        <Text style={S.sectionHead}>Gas (QW-408)</Text>
        <View style={S.grid2}>
          <Field label="Shielding Gas"   value={gas.shielding} />
          <Field label="Trailing Gas"    value={gas.trailing} />
          <Field label="Backing Gas"     value={gas.backing} />
          <Field label="% Composition"   value={gas.composition} />
          <Field label="Flow Rate (lpm)" value={gas.flow_rate} />
        </View>

        {/* Electrical Characteristics (QW-409) */}
        <Text style={S.sectionHead}>Electrical Characteristics (QW-409)</Text>
        <View style={S.grid2}>
          <Field label="Current (AC/DC)"  value={elec.current_type} />
          <Field label="Polarity"         value={elec.polarity} />
          <Field label="Amps (Range)"     value={elec.current_range ? `${elec.current_range} A` : null} />
          <Field label="Volts (Range)"    value={elec.voltage_range ? `${elec.voltage_range} V` : null} />
          <Field label="Tungsten Elec. Size" value={elec.tungsten_electrode_size} />
          <Field label="Travel Speed"     value={elec.travel_speed ? `${elec.travel_speed} mm/min` : null} />
          <Field label="Heat Input"       value={elec.heat_input ? `${elec.heat_input} kJ/mm` : null} />
        </View>

        {/* Weld Pass Parameters */}
        {weldPasses.length > 0 && (
          <>
            <Text style={S.sectionHead}>Weld Pass Parameters</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                {PASS_COLS.map((c) => (
                  <Text key={c.key} style={[S.thCell, { width: c.width }]}>{c.label}</Text>
                ))}
              </View>
              {weldPasses.map((row, i) => (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  {PASS_COLS.map((c) => (
                    <Text key={c.key} style={[S.tdCell, { width: c.width }]}>{row[c.key as keyof WeldPassRow] ?? ""}</Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Technique (QW-410) */}
        <Text style={S.sectionHead}>Technique (QW-410)</Text>
        <View style={S.grid2}>
          <Field label="Bead Type"            value={tech.bead_type} />
          <Field label="Oscillation"          value={tech.oscillation} />
          <Field label="Pass/Side"            value={tech.pass_type} />
          <Field label="Layer"                value={tech.multi_single_layer} />
          <Field label="Electrode"            value={tech.multi_single_electrode} />
          <Field label="Contact Tube Dist."   value={tech.contact_tube_distance} />
          <Field label="Orifice/Gas Cup"      value={tech.orifice_gas_cup_size} />
          <Field label="Interpass Cleaning"   value={tech.cleaning_method} />
          <Field label="Back Gouging"         value={tech.back_gouging} />
          <Field label="Electrode Spacing"    value={tech.electrode_spacing} />
          <Field label="Change of Process"    value={tech.change_of_process} />
          <Field label="Peening"              value={tech.peening} />
          <Field label="Transfer Mode"        value={tech.transfer_mode} />
          <Field label="Torch Orifice Dia."   value={tech.torch_orifice_dia} />
          <Field label="Filler Delivery"      value={tech.filler_metal_delivery} />
          <Field label="Thermal Process"      value={tech.use_of_thermal_process} />
        </View>

        {/* Tensile Test Results (QW-150) */}
        {tensileTests.length > 0 && (
          <>
            <Text style={S.sectionHead}>Tensile Test Results (QW-150)</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                {TENSILE_COLS.map((c) => (
                  <Text key={c.key} style={[S.thCell, { width: c.width }]}>{c.label}</Text>
                ))}
              </View>
              {tensileTests.map((row, i) => (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  {TENSILE_COLS.map((c) => (
                    <Text key={c.key} style={[S.tdCell, { width: c.width }]}>{row[c.key as keyof TensileTestRow] ?? ""}</Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Approval */}
        <Text style={[S.sectionHead, { marginTop: 8 }]}>Approval</Text>
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>{wps.approved_by ?? ""}</Text>
            <Text>Prepared &amp; Approved By</Text>
          </View>
          <View style={S.sigBox}>
            <Text>{wps.reviewed_by ?? ""}</Text>
            <Text>Reviewed By</Text>
          </View>
        </View>
        {wps.notes && (
          <View style={{ marginTop: 8 }}>
            <Field label="Notes" value={wps.notes} width="full" />
          </View>
        )}

        <View style={[S.divider, { marginTop: 10 }]} />
        <Text style={{ color: "#9ca3af", textAlign: "center", fontSize: 7 }}>
          Raghav Engineering · WPS · {wps.wps_no} · {wps.revision}
        </Text>
      </Page>
    </Document>
  )
}
