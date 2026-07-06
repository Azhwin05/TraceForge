// react-pdf/renderer template — runs server-side only (no "use client")
// PWHT Chart Recorder report: cycle details + temperature-vs-time graph.
import React from "react"
import {
  Document, Page, Text, View, StyleSheet,
  Svg, Polyline, Line as SvgLine, Text as SvgText, Rect,
} from "@react-pdf/renderer"
import type { PwhtRun, PwhtChartReading } from "@/types/database"

const S = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 8, padding: 28, color: "#111" },
  title:       { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  subtitle:    { fontSize: 8, textAlign: "center", marginBottom: 8, color: "#444" },
  sectionHead: { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#ffedd5", padding: "3 6", marginBottom: 2, marginTop: 6 },
  grid2:       { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 4 },
  field:       { width: "48%", flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db" },
  label:       { backgroundColor: "#f3f4f6", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold", width: 100 },
  value:       { paddingHorizontal: 4, paddingVertical: 2, flex: 1 },
  chartBox:    { borderWidth: 1, borderColor: "#d1d5db", marginTop: 4, padding: 4 },
  jobsRow:     { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  jobsHeader:  { flexDirection: "row", backgroundColor: "#7c2d12", color: "#fff" },
  jobsHeadCell:{ paddingHorizontal: 4, paddingVertical: 3, fontFamily: "Helvetica-Bold", color: "#fff", flex: 1 },
  jobsCell:    { paddingHorizontal: 4, paddingVertical: 2, flex: 1 },
  sigRow:      { flexDirection: "row", gap: 16, marginTop: 16 },
  sigBox:      { flex: 1, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 3, textAlign: "center" },
  footer:      { position: "absolute", bottom: 16, left: 28, right: 28, textAlign: "center", color: "#999", fontSize: 7 },
})

const CHANNEL_COLORS = ["#0070f3", "#e6552e", "#0e9f6e", "#7c3aed", "#d97706", "#0891b2"]

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={S.field}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value || "—"}</Text>
    </View>
  )
}

// Down-sample readings so the polyline stays a reasonable size
function downsample<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points
  const step = points.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)])
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1])
  return out
}

function ChartSvg({ readings, soakTemp }: { readings: PwhtChartReading[]; soakTemp: number | null }) {
  const W = 520, H = 240
  const PAD = { left: 44, right: 12, top: 12, bottom: 28 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const times = readings.map((r) => new Date(r.recorded_at).getTime())
  const temps = readings.map((r) => Number(r.temperature_c))
  const tMin = Math.min(...times), tMax = Math.max(...times)
  let yMin = Math.min(...temps, soakTemp ?? Infinity)
  let yMax = Math.max(...temps, soakTemp ?? -Infinity)
  if (yMax === yMin) { yMax += 10; yMin -= 10 }
  const yPad = (yMax - yMin) * 0.08
  yMin -= yPad; yMax += yPad

  const x = (t: number) => PAD.left + (tMax === tMin ? plotW / 2 : ((t - tMin) / (tMax - tMin)) * plotW)
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH

  const channels = Array.from(new Set(readings.map((r) => r.channel))).sort()

  // Y-axis gridlines (5 divisions)
  const yTicks = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) * i) / 5)
  // X-axis labels (start / mid / end)
  const xTicks = [tMin, (tMin + tMax) / 2, tMax]
  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      {/* gridlines + y labels */}
      {yTicks.map((v, i) => (
        <React.Fragment key={i}>
          <SvgLine x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke="#e5e7eb" strokeWidth={0.5} />
          <SvgText x={PAD.left - 4} y={y(v) + 2} style={{ fontSize: 6, textAnchor: "end", fill: "#666" }}>
            {`${Math.round(v)}°C`}
          </SvgText>
        </React.Fragment>
      ))}
      {/* x labels */}
      {xTicks.map((t, i) => (
        <SvgText key={i} x={x(t)} y={H - PAD.bottom + 12} style={{ fontSize: 6, textAnchor: "middle", fill: "#666" }}>
          {fmtTime(t)}
        </SvgText>
      ))}
      {/* axes */}
      <SvgLine x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#374151" strokeWidth={1} />
      <SvgLine x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#374151" strokeWidth={1} />
      {/* soak reference */}
      {soakTemp !== null && soakTemp > 0 && (
        <>
          <SvgLine
            x1={PAD.left} y1={y(soakTemp)} x2={W - PAD.right} y2={y(soakTemp)}
            stroke="#e6552e" strokeWidth={0.8} strokeDasharray="4 3"
          />
          <SvgText x={W - PAD.right - 2} y={y(soakTemp) - 3} style={{ fontSize: 6, textAnchor: "end", fill: "#e6552e" }}>
            {`Soak ${soakTemp}°C`}
          </SvgText>
        </>
      )}
      {/* one polyline per channel */}
      {channels.map((ch, i) => {
        const pts = downsample(
          readings.filter((r) => r.channel === ch), 400
        ).map((r) => `${x(new Date(r.recorded_at).getTime()).toFixed(1)},${y(Number(r.temperature_c)).toFixed(1)}`)
        return (
          <Polyline
            key={ch}
            points={pts.join(" ")}
            fill="none"
            stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
            strokeWidth={1.4}
          />
        )
      })}
      {/* channel legend */}
      {channels.map((ch, i) => (
        <React.Fragment key={ch}>
          <SvgLine
            x1={PAD.left + 8 + i * 60} y1={PAD.top + 4} x2={PAD.left + 24 + i * 60} y2={PAD.top + 4}
            stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} strokeWidth={1.6}
          />
          <SvgText x={PAD.left + 27 + i * 60} y={PAD.top + 6.5} style={{ fontSize: 6, fill: "#333" }}>{ch}</SvgText>
        </React.Fragment>
      ))}
    </Svg>
  )
}

export function PwhtChartPdf({
  run,
  readings,
  jobs,
}: {
  run: PwhtRun
  readings: PwhtChartReading[]
  jobs: Array<{ jc_number: string; description: string }>
}) {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—")

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>POST WELD HEAT TREATMENT — CHART RECORDER REPORT</Text>
        <Text style={S.subtitle}>Raghav Engineering · ValveTrack ERP</Text>

        <Text style={S.sectionHead}>CYCLE IDENTIFICATION</Text>
        <View style={S.grid2}>
          <Field label="Chart Number"      value={run.chart_number} />
          <Field label="Furnace ID"        value={run.furnace_id} />
          <Field label="Date of Cycle"     value={run.date_of_cycle} />
          <Field label="Operator"          value={run.operator_name} />
          <Field label="WPS Number"        value={run.wps_number} />
          <Field label="Component ID"      value={run.component_identification} />
          <Field label="Cycle Start"       value={fmt(run.cycle_start)} />
          <Field label="Cycle End"         value={fmt(run.cycle_end)} />
        </View>

        <Text style={S.sectionHead}>CYCLE PARAMETERS</Text>
        <View style={S.grid2}>
          <Field label="Loading Temp"      value={`${run.loading_temp} °C`} />
          <Field label="Soaking Temp"      value={`${run.soaking_temp} °C`} />
          <Field label="Soaking Time"      value={`${run.soaking_time} min`} />
          <Field label="Rate of Heating"   value={`${run.rate_of_heating} °C/hr`} />
          <Field label="Rate of Cooling"   value={run.rate_of_cooling != null ? `${run.rate_of_cooling} °C/hr` : null} />
          <Field label="Approval Status"   value={run.approval_status.toUpperCase()} />
        </View>

        <Text style={S.sectionHead}>{`TEMPERATURE vs TIME (${readings.length} readings)`}</Text>
        <View style={S.chartBox}>
          <ChartSvg readings={readings} soakTemp={run.soaking_temp != null ? Number(run.soaking_temp) : null} />
        </View>

        <Text style={S.sectionHead}>LINKED JOB CARDS</Text>
        <View>
          <View style={S.jobsHeader}>
            <Text style={S.jobsHeadCell}>Job Card No.</Text>
            <Text style={[S.jobsHeadCell, { flex: 3 }]}>Description</Text>
          </View>
          {jobs.length === 0 ? (
            <View style={S.jobsRow}><Text style={S.jobsCell}>—</Text></View>
          ) : (
            jobs.map((j, i) => (
              <View key={i} style={S.jobsRow}>
                <Text style={S.jobsCell}>{j.jc_number}</Text>
                <Text style={[S.jobsCell, { flex: 3 }]}>{j.description}</Text>
              </View>
            ))
          )}
        </View>

        {run.notes ? (
          <>
            <Text style={S.sectionHead}>NOTES</Text>
            <Text style={{ padding: 4 }}>{run.notes}</Text>
          </>
        ) : null}

        <View style={S.sigRow}>
          <View style={S.sigBox}><Text>Operator</Text></View>
          <View style={S.sigBox}><Text>QA / Inspector</Text></View>
          <View style={S.sigBox}><Text>Approved By</Text></View>
        </View>

        <Text style={S.footer} fixed>
          {`Generated by ValveTrack · Chart ${run.chart_number} · ${new Date().toLocaleString()}`}
        </Text>
      </Page>
    </Document>
  )
}
