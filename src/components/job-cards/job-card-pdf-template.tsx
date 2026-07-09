// react-pdf/renderer template — server-side only, no "use client"
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type {
  JobCard, Client, ProcessExecutionWithConsumable, NdeRecord, AirTestRecord,
  DimensionReport, Dispatch, OverlayChemicalEntry,
} from "@/types/database"

const S = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 8, padding: 24, color: "#111" },
  title:        { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  subtitle:     { fontSize: 9, textAlign: "center", marginBottom: 6, color: "#444" },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#aaa", marginBottom: 6, marginTop: 2 },
  sectionHead:  { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#e0e7ff", padding: "3 6", marginBottom: 3, marginTop: 6 },
  subHead:      { fontSize: 7.5, fontFamily: "Helvetica-Bold", marginTop: 3, marginBottom: 2, color: "#374151" },

  grid2:        { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 3 },
  field:        { width: "48%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  fieldFull:    { width: "100%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db", marginBottom: 2 },
  label:        { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 96 },
  value:        { paddingHorizontal: 4, paddingVertical: 2, flex: 1 },

  table:        { marginTop: 3, marginBottom: 6, borderWidth: 1, borderColor: "#d1d5db" },
  tableHeader:  { flexDirection: "row", backgroundColor: "#3730a3" },
  thCell:       { paddingHorizontal: 3, paddingVertical: 3, fontFamily: "Helvetica-Bold", color: "#fff", borderRightWidth: 1, borderRightColor: "#a5b4fc", fontSize: 6.5 },
  tableRow:     { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  tableRowAlt:  { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f5f5ff" },
  tdCell:       { paddingHorizontal: 3, paddingVertical: 2, borderRightWidth: 1, borderRightColor: "#e5e7eb", fontSize: 6.5 },

  sigRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  sigBox: { flex: 1, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 3, textAlign: "center" },
})

function Field({ label, value, full }: { label: string; value?: string | number | null; full?: boolean }) {
  const style = full ? S.fieldFull : S.field
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

const PROCESS_LABELS: Record<string, string> = {
  welding: "Welding", machining: "Machining", cladding: "Cladding", overlay: "Overlay",
}

// Inlined (not imported) so the standalone PDF renderer needs no path resolution.
const OPERATION_LABELS: Record<string, string> = {
  pre_machining: "Pre-Machining", welding: "Welding", final_machining: "Final Machining",
  milling: "Milling", slitting: "Slitting", deburring: "Deburring",
}
const OP_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned", in_progress: "In Progress", completed: "Completed", skipped: "Skipped",
}
const WELDING_FAMILY = ["welding", "cladding", "overlay"]

type ExecRow = ProcessExecutionWithConsumable & {
  machine?: { machine_code: string; name: string } | null
}

// A routed record whose operation is welding, or a legacy welding-family record.
function isWeldingExec(e: ExecRow): boolean {
  if (e.operation_type) return e.operation_type === "welding"
  return WELDING_FAMILY.includes(e.process_type)
}

const OP_COLS = [
  { label: "#",         width: 20 },
  { label: "Operation", width: 90 },
  { label: "Machine",   width: 75 },
  { label: "Operator",  width: 80 },
  { label: "Planned",   width: 45 },
  { label: "Completed", width: 50 },
  { label: "Rejected",  width: 45 },
  { label: "Status",    width: 65 },
]

const CHEM_COLS = [
  { key: "chemical_type", label: "Type",         width: 55 },
  { key: "chemical_name", label: "Chemical",      width: 95 },
  { key: "manufacturer",  label: "Manufacturer",  width: 90 },
  { key: "batch_no",      label: "Batch No.",     width: 65 },
  { key: "expiry_date",   label: "Expiry",        width: 55 },
]

const DIM_COLS = [
  { key: "dimension_name",     label: "Dimension",  width: 130 },
  { key: "required_dimension", label: "Required",   width: 60 },
  { key: "tolerance",          label: "Tolerance",  width: 55 },
  { key: "actual_value_1",     label: "Actual 1",   width: 50 },
  { key: "actual_value_2",     label: "Actual 2",   width: 50 },
  { key: "actual_value_3",     label: "Actual 3",   width: 50 },
  { key: "pass_fail",          label: "P/F",        width: 40 },
]

type DimensionRow = {
  dimension_name?: string; required_dimension?: string; tolerance?: string
  actual_value_1?: string; actual_value_2?: string; actual_value_3?: string; pass_fail?: string
}

type PwhtRunSummary = {
  chart_number: string; process_name: string | null
  loading_temp: number; loading_time: number | null
  soaking_temp: number; soaking_time: number
  unloading_temp: number | null; unloading_time: number | null
}

export function JobCardPdfTemplate({
  jobCard, client, executions, ndeRecords, airTests, dimensionReports, dispatches, pwhtRuns,
}: {
  jobCard: JobCard
  client: Client | null
  executions: ExecRow[]
  ndeRecords: NdeRecord[]
  airTests: AirTestRecord[]
  dimensionReports: DimensionReport[]
  dispatches: Dispatch[]
  pwhtRuns: PwhtRunSummary[]
}) {
  return (
    <Document title={`Job Card — ${jobCard.jc_number}`}>
      <Page size="A4" style={S.page}>

        <Text style={S.title}>RAGHAV ENGINEERING</Text>
        <Text style={S.subtitle}>Job Card — {jobCard.jc_number}</Text>
        <View style={S.divider} />

        {/* Basic Info */}
        <Text style={S.sectionHead}>Basic Information</Text>
        <View style={S.grid2}>
          <Field label="Job Card No." value={jobCard.jc_number} />
          <Field label="Received Date" value={fmtDate(jobCard.received_date)} />
          <Field label="Due Date" value={fmtDate(jobCard.due_date)} />
          <Field label="Customer" value={client?.name} />
          <Field label="NBDN No." value={jobCard.nbdn_number} />
          <Field label="PO No." value={jobCard.po_number} />
          <Field label="Drawing No." value={jobCard.drawing_number} />
          <Field label="Heat No." value={jobCard.heat_number} />
          <Field label="Part No." value={jobCard.part_number} />
          <Field label="Quantity" value={jobCard.quantity} />
          <Field label="Process" value={jobCard.process_type.map((t) => PROCESS_LABELS[t] ?? t).join(", ")} />
          <Field label="Welding Process" value={jobCard.welding_process} />
          <Field label="Ring" value={jobCard.ring} />
        </View>
        <Field label="Description" value={jobCard.description} full />

        {/* Customer / Material */}
        <Text style={S.sectionHead}>Customer / Material Details</Text>
        <View style={S.grid2}>
          <Field label="Product Group" value={jobCard.product_group} />
          <Field label="Buyer" value={jobCard.buyer} />
          <Field label="Material Code" value={jobCard.material_code} />
          <Field label="Valve Size/Class" value={jobCard.valve_size_class} />
          <Field label="Valve Type/Comp." value={jobCard.valve_type_component} />
          <Field label="Base Material" value={jobCard.base_material} />
          <Field label="Overlay Material" value={jobCard.overlay_material} />
          <Field label="Base Mat. Grade" value={jobCard.base_material_grade} />
          <Field label="Regularization" value={jobCard.regularization} />
          <Field label="Ring Heat No." value={jobCard.ring_heat_no} />
          <Field label="MPI / RT No." value={jobCard.mpi_rt_no} />
          <Field label="Punching Details" value={jobCard.punching_details} />
          <Field label="Other Details" value={jobCard.other_details} />
        </View>

        {/* Operations / Routing */}
        {executions.some((e) => e.operation_type != null) && (
          <>
            <Text style={S.sectionHead}>Operations / Routing</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                {OP_COLS.map((c) => (
                  <Text key={c.label} style={[S.thCell, { width: c.width }]}>{c.label}</Text>
                ))}
              </View>
              {[...executions]
                .filter((e) => e.operation_type != null)
                .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0))
                .map((e, i) => (
                  <View key={e.id ?? i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                    <Text style={[S.tdCell, { width: 20 }]}>{e.sequence_no ?? ""}</Text>
                    <Text style={[S.tdCell, { width: 90 }]}>{OPERATION_LABELS[e.operation_type as string] ?? e.operation_type}</Text>
                    <Text style={[S.tdCell, { width: 75 }]}>{e.machine?.machine_code ?? ""}</Text>
                    <Text style={[S.tdCell, { width: 80 }]}>{e.welder_name ?? ""}</Text>
                    <Text style={[S.tdCell, { width: 45 }]}>{e.planned_qty ?? ""}</Text>
                    <Text style={[S.tdCell, { width: 50 }]}>{e.completed_qty ?? ""}</Text>
                    <Text style={[S.tdCell, { width: 45 }]}>{e.rejected_qty ?? ""}</Text>
                    <Text style={[S.tdCell, { width: 65 }]}>{OP_STATUS_LABELS[e.status] ?? e.status}</Text>
                  </View>
                ))}
            </View>
          </>
        )}

        {/* Welding */}
        {executions.some(isWeldingExec) && (
          <>
            <Text style={S.sectionHead}>Welding Details</Text>
            {executions.filter(isWeldingExec).map((e, i) => (
              <View key={e.id ?? i} style={{ marginBottom: 4 }}>
                <Text style={S.subHead}>{PROCESS_LABELS[e.process_type] ?? e.process_type} — {e.welder_name ?? ""} {e.welder_id ? `(ID: ${e.welder_id})` : ""}</Text>
                <View style={S.grid2}>
                  <Field label="Weld Date" value={fmtDate(e.weld_date)} />
                  <Field label="Weld Metal" value={e.weld_metal} />
                  <Field label="Weld Height" value={e.weld_height} />
                  <Field label="Consumable Batch" value={e.consumable?.batch_no ?? e.consumable_batch} />
                </View>
                {e.consumable && (
                  <View style={S.grid2}>
                    <Field label="Consumable Brand" value={e.consumable.brand} />
                    <Field label="Product Name" value={e.consumable.product_name} />
                    <Field label="AWS Class" value={e.consumable.aws_class} />
                    <Field label="Size" value={e.consumable.size} />
                    <Field label="Mfg. Date" value={fmtDate(e.consumable.manufacturing_date)} />
                    <Field label="Expiry Date" value={fmtDate(e.consumable.expiry_date)} />
                  </View>
                )}
                <View style={S.table}>
                  <View style={S.tableHeader}>
                    <Text style={[S.thCell, { width: 130 }]}>Parameter</Text>
                    <Text style={[S.thCell, { width: 120 }]}>As per WPS</Text>
                    <Text style={[S.thCell, { width: 120 }]}>Actual</Text>
                  </View>
                  {[
                    { label: "Weld Qty",       wps: e.weld_qty_planned,            act: e.weld_qty_actual },
                    { label: "Pre-heat (°C)",  wps: e.pre_heat_temp_planned,       act: e.pre_heat_temp },
                    { label: "Inter-pass (°C)",wps: e.inter_pass_temp_planned,     act: e.inter_pass_temp },
                    { label: "Post-heat (°C)", wps: e.post_heat_temp_planned,      act: e.post_heat_temp },
                    { label: "Amp",            wps: e.amps_required,               act: e.amps_actual },
                    { label: "Volt",           wps: e.volts_required,              act: e.volts_actual },
                    { label: "Travel Speed",   wps: e.travel_speed_planned,        act: e.travel_speed },
                    { label: "Gas Flow Rate",  wps: e.gas_flow_rate_planned,       act: e.gas_flow_rate },
                    { label: "Feed Rate",      wps: e.consumable_feed_rate_planned, act: e.consumable_feed_rate },
                    { label: "Polarity",       wps: e.polarity_planned,            act: e.polarity },
                  ].map((row, ri) => (
                    <View key={row.label} style={ri % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                      <Text style={[S.tdCell, { width: 130 }]}>{row.label}</Text>
                      <Text style={[S.tdCell, { width: 120 }]}>{row.wps ?? ""}</Text>
                      <Text style={[S.tdCell, { width: 120 }]}>{row.act ?? ""}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* PWHT */}
        {pwhtRuns.length > 0 && (
          <>
            <Text style={S.sectionHead}>PWHT Details</Text>
            {pwhtRuns.map((p, i) => (
              <View key={i} style={S.grid2}>
                <Field label="Chart No." value={p.chart_number} />
                <Field label="Process" value={p.process_name} />
                <Field label="Loading Temp" value={p.loading_temp} />
                <Field label="Loading Time" value={p.loading_time} />
                <Field label="Soaking Temp" value={p.soaking_temp} />
                <Field label="Soaking Time" value={p.soaking_time} />
                <Field label="Unloading Temp" value={p.unloading_temp} />
                <Field label="Unloading Time" value={p.unloading_time} />
              </View>
            ))}
          </>
        )}

        {/* Air Testing */}
        {airTests.length > 0 && (
          <>
            <Text style={S.sectionHead}>Air Testing &amp; Inspection</Text>
            {airTests.map((a) => (
              <View key={a.id} style={S.grid2}>
                <Field label="Tester Name" value={a.tester_name} />
                <Field label="Pressure" value={a.pressure} />
                <Field label="Duration" value={a.duration} />
                <Field label="Result" value={a.result} />
              </View>
            ))}
          </>
        )}

        {/* NDE */}
        {ndeRecords.map((r) => (
          <View key={r.id} style={{ marginBottom: 4 }}>
            <Text style={S.sectionHead}>NDE / LPT — {r.nde_type.toUpperCase()}</Text>
            <View style={S.grid2}>
              <Field label="NDE Number" value={r.nde_number} />
              <Field label="Report No." value={r.report_number} />
              <Field label="Test Coupon No." value={r.test_coupon_number} />
              <Field label="Deposit Thickness" value={r.deposit_thickness} />
              <Field label="Hardness Req." value={r.hardness_requirement} />
              <Field label="Duration" value={r.duration} />
              <Field label="Observer" value={r.observer} />
              <Field label="Inspected By" value={r.inspected_by} />
              <Field label="Result" value={r.result} />
            </View>
            {Array.isArray(r.chemicals_used_json) && (r.chemicals_used_json as unknown as OverlayChemicalEntry[]).length > 0 && (
              <View style={S.table}>
                <View style={S.tableHeader}>
                  {CHEM_COLS.map((c) => <Text key={c.key} style={[S.thCell, { width: c.width }]}>{c.label}</Text>)}
                </View>
                {(r.chemicals_used_json as unknown as OverlayChemicalEntry[]).map((ch, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                    {CHEM_COLS.map((c) => (
                      <Text key={c.key} style={[S.tdCell, { width: c.width }]}>{ch[c.key as keyof OverlayChemicalEntry] ?? ""}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Machining / Dimensions */}
        {dimensionReports.map((d) => {
          const rows = Array.isArray(d.dimensions) ? (d.dimensions as unknown as DimensionRow[]) : []
          return (
            <View key={d.id} style={{ marginBottom: 4 }}>
              <Text style={S.sectionHead}>Machining / Dimensions</Text>
              <View style={S.grid2}>
                <Field label="Machine Name" value={d.machine_name} />
                <Field label="Operator" value={d.operator} />
                <Field label="Drawing Size" value={d.drawing_size} />
                <Field label="Deposit Thk. Before" value={d.weld_deposit_thickness_before} />
                <Field label="Deposit Thk. After" value={d.weld_deposit_thickness_after} />
              </View>
              {rows.length > 0 && (
                <View style={S.table}>
                  <View style={S.tableHeader}>
                    {DIM_COLS.map((c) => <Text key={c.key} style={[S.thCell, { width: c.width }]}>{c.label}</Text>)}
                  </View>
                  {rows.map((row, i) => (
                    <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                      {DIM_COLS.map((c) => (
                        <Text key={c.key} style={[S.tdCell, { width: c.width }]}>{row[c.key as keyof DimensionRow] ?? ""}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}

        {/* Dispatch */}
        {dispatches.length > 0 && (
          <>
            <Text style={S.sectionHead}>Dispatch</Text>
            {dispatches.map((d) => (
              <View key={d.id} style={S.grid2}>
                <Field label="DC Number" value={d.dc_number} />
                <Field label="Dispatch Date" value={fmtDate(d.dispatch_date)} />
                <Field label="Vehicle Details" value={d.vehicle_details} />
              </View>
            ))}
          </>
        )}

        {/* Sign-off */}
        <Text style={[S.sectionHead, { marginTop: 8 }]}>Approvals</Text>
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>{jobCard.production_checked_by ?? ""}</Text>
            <Text>Production {jobCard.production_checked_date ? `(${fmtDate(jobCard.production_checked_date)})` : ""}</Text>
          </View>
          <View style={S.sigBox}>
            <Text>{jobCard.qc_checked_by ?? ""}</Text>
            <Text>Quality Control {jobCard.qc_checked_date ? `(${fmtDate(jobCard.qc_checked_date)})` : ""}</Text>
          </View>
          <View style={S.sigBox}>
            <Text>{jobCard.stores_checked_by ?? ""}</Text>
            <Text>Stores {jobCard.stores_checked_date ? `(${fmtDate(jobCard.stores_checked_date)})` : ""}</Text>
          </View>
        </View>

        <View style={[S.divider, { marginTop: 10 }]} />
        <Text style={{ color: "#9ca3af", textAlign: "center", fontSize: 7 }}>
          Raghav Engineering · Job Card · {jobCard.jc_number} · {fmtDate(jobCard.received_date)}
        </Text>

      </Page>
    </Document>
  )
}
