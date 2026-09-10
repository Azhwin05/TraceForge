import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WpsApproveActions } from "@/components/master-data/wps-approve-actions"
import { WpsMasterPdfButton } from "@/components/master-data/wps-master-pdf-button"
import { DocumentCard } from "@/components/documents/document-card"
import { FileUpload } from "@/components/documents/file-upload"
import { cn } from "@/lib/utils"
import type { WpsMaster, WpsMasterStatus, UserRole, Document, WeldPassRow, TensileTestRow } from "@/types/database"

export const metadata = { title: "WPS Detail — ValveTrack" }
export const revalidate = 30

const STATUS_BADGE: Record<WpsMasterStatus, { label: string; className: string }> = {
  draft:      { label: "Draft",      className: "bg-warning-surface text-warning" },
  approved:   { label: "Approved",   className: "bg-success-surface text-success" },
  superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-1.5 text-sm border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const PASS_COLS: { key: keyof WeldPassRow; label: string }[] = [
  { key: "pass_label",           label: "Weld Pass" },
  { key: "process",              label: "Process" },
  { key: "filler_classification", label: "Filler Classification" },
  { key: "filler_diameter",       label: "Diameter" },
  { key: "current_type_polarity", label: "Current Type & Polarity" },
  { key: "amps_range",            label: "Amps (Range)" },
  { key: "volts_range",           label: "Volts (Range)" },
  { key: "travel_speed_range",    label: "Travel Speed (Range)" },
  { key: "heat_input",            label: "Heat Input" },
]

const TENSILE_COLS: { key: keyof TensileTestRow; label: string }[] = [
  { key: "specimen_no",           label: "Specimen No." },
  { key: "width",                 label: "Width (mm)" },
  { key: "thickness",             label: "Thickness (mm)" },
  { key: "area",                  label: "Area (mm²)" },
  { key: "ultimate_load",         label: "Ultimate Load (KN)" },
  { key: "ultimate_stress",       label: "Ultimate Stress (MPa)" },
  { key: "failure_type_location", label: "Type of Failure & Location" },
]

function DataTable<T extends Record<string, unknown>>({
  columns, rows,
}: { columns: { key: keyof T; label: string }[]; rows: T[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No data recorded.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/70">
            {columns.map((c) => (
              <th key={String(c.key)} className="border border-border px-2 py-1.5 text-left font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={String(c.key)} className="border border-border px-2 py-1.5">{(row[c.key] as string) || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function WpsMasterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, profile } = await requireAuth()

  const [{ data: wps }, { data: docs }] = await Promise.all([
    supabase.from("wps_master").select("*").eq("id", id).single(),
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "wps_master")
      .eq("entity_id", id)
      .eq("is_active", true)
      .eq("is_latest", true)
      .order("uploaded_at", { ascending: false }),
  ])

  if (!wps) notFound()

  const record = wps as WpsMaster
  const userRole = (profile?.role ?? "operator") as UserRole
  const badge = STATUS_BADGE[record.status]

  const canEdit =
    ["admin", "qa"].includes(userRole) && record.status !== "superseded"
  const canApprove = userRole === "admin" && record.status === "draft"
  const canSupersede = userRole === "admin" && record.status === "approved"

  const gas    = (record.gas_json               ?? {}) as Record<string, string>
  const elec   = (record.electrical_params_json ?? {}) as Record<string, string>
  const tech   = (record.technique_json         ?? {}) as Record<string, string>
  const joint  = (record.joint_json             ?? {}) as Record<string, string>
  const base   = (record.base_metal_json        ?? {}) as Record<string, string>
  const filler = (record.filler_metal_json      ?? {}) as Record<string, string>
  const weldPasses   = record.weld_passes_json   ?? []
  const tensileTests = record.tensile_tests_json ?? []

  const latestDoc = ((docs ?? []) as Document[])[0] ?? null

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/master-data/wps"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to WPS Master
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold font-mono tracking-tight">{record.wps_no}</h1>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.className)}>
                {badge.label}
              </span>
            </div>
            {record.pqr_no && (
              <p className="text-sm text-muted-foreground">PQR: {record.pqr_no}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WpsMasterPdfButton wpsId={id} />
            {canEdit && (
              <Link
                href={`/master-data/wps/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </Link>
            )}
            {(canApprove || canSupersede) && (
              <WpsApproveActions
                wpsId={id}
                canApprove={canApprove}
                canSupersede={canSupersede}
              />
            )}
          </div>
        </div>
      </div>

      {/* Document upload / display */}
      <Section title="WPS Document">
        <div className="space-y-3">
          <DocumentCard document={latestDoc} label="WPS PDF" />
          <FileUpload
            entityType="wps_master"
            entityId={id}
            documentType="wps_pdf"
            userRole={userRole}
            sourceModule="wps_master_detail"
            label={latestDoc ? "Replace Document" : "Upload WPS PDF"}
          />
        </div>
      </Section>

      {/* Basic */}
      <Section title="Basic Information">
        <Row label="WPS Number"    value={<span className="font-mono">{record.wps_no}</span>} />
        <Row label="PQR Number"    value={record.pqr_no} />
        <Row label="Process"       value={record.welding_process} />
        <Row label="Type"          value={record.type} />
        <Row label="Revision"      value={record.revision} />
        <Row label="Effective Date"
          value={record.effective_date
            ? new Date(record.effective_date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })
            : null}
        />
        <Row label="Date of Welding"
          value={record.date_of_welding
            ? new Date(record.date_of_welding).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })
            : null}
        />
        {record.scope && <Row label="Scope" value={record.scope} />}
      </Section>

      {/* Joints (QW-402) */}
      <Section title="Joints (QW-402)">
        <Row label="Groove Type"     value={record.joint_design} />
        <Row label="Root Gap"        value={joint.root_gap} />
        <Row label="Root Face"       value={joint.root_face} />
        <Row label="Groove Angle"    value={joint.groove_angle} />
        <Row label="Groove Length"   value={joint.groove_length} />
        <Row label="Groove Width"    value={joint.groove_width} />
        <Row label="Backing"         value={joint.backing} />
        <Row label="Retainer"        value={joint.retainer} />
      </Section>

      {/* Base Metals (QW-403) */}
      <Section title="Base Metals (QW-403)">
        <Row label="Material Specification"     value={base.material_spec} />
        <Row label="Type or Grade"               value={base.type_grade} />
        <Row label="P.No."                       value={base.p_no} />
        <Row label="Heat No."                    value={base.heat_no} />
        <Row label="Thickness of Test Coupon"    value={base.test_coupon_thickness} />
        <Row label="Diameter of Test Coupon"     value={base.test_coupon_diameter} />
        <Row label="Base Material (summary)"     value={record.base_material} />
      </Section>

      {/* Filler Metals (QW-404) */}
      <Section title="Filler Metals (QW-404)">
        <Row label="SFA Specification"              value={filler.sfa_spec} />
        <Row label="AWS Classification"              value={record.filler_aws_class} />
        <Row label="Filler Metal F.No."              value={filler.f_no} />
        <Row label="Weld Metal Analysis A.No."       value={filler.a_no} />
        <Row label="Size of Filler Metal"            value={record.filler_size} />
        <Row label="Filler Metal / Powder Feed Rate" value={filler.feed_rate} />
        <Row label="Weld Metal Thickness"            value={filler.weld_metal_thickness} />
        <Row label="Filler Material (summary)"       value={record.filler_material} />
      </Section>

      {/* Position (QW-405) */}
      <Section title="Position (QW-405)">
        <Row label="Position of Groove" value={record.position} />
        <Row label="Weld Progression"   value={record.weld_progression} />
      </Section>

      {/* Preheat (QW-406) */}
      <Section title="Preheat (QW-406)">
        <Row label="Preheat Temperature"   value={record.preheat_min != null ? `${record.preheat_min} °C` : null} />
        <Row label="Interpass Temperature" value={record.interpass_max != null ? `${record.interpass_max} °C` : null} />
        <Row label="Others"                value={record.preheat_other} />
      </Section>

      {/* PWHT (QW-407) */}
      <Section title="Post Weld Heat Treatment (QW-407)">
        <Row label="PWHT Required" value={record.pwht_required ? "Yes" : "No"} />
        {record.pwht_required && (
          <>
            <Row
              label="Temperature Range"
              value={
                record.pwht_temp_min != null || record.pwht_temp_max != null
                  ? `${record.pwht_temp_min ?? "—"} – ${record.pwht_temp_max ?? "—"} °C`
                  : null
              }
            />
            <Row label="Time Range"             value={record.pwht_time_range} />
            <Row label="Cooling"                 value={record.pwht_cooling_method} />
            <Row label="Rate of Heating/Cooling" value={record.pwht_rate_of_heating} />
            <Row label="Loading Temperature"     value={record.pwht_loading_temp} />
            <Row label="Unloading Temperature"   value={record.pwht_unloading_temp} />
          </>
        )}
      </Section>

      {/* Gas (QW-408) */}
      {(gas.shielding || gas.trailing || gas.backing || gas.composition || gas.flow_rate) && (
        <Section title="Gas (QW-408)">
          {gas.shielding   && <Row label="Shielding Gas"           value={gas.shielding} />}
          {gas.trailing    && <Row label="Trailing Gas"            value={gas.trailing} />}
          {gas.backing     && <Row label="Backing Gas"             value={gas.backing} />}
          {gas.composition && <Row label="% Composition / Mixture" value={gas.composition} />}
          {gas.flow_rate   && <Row label="Flow Rate (lpm)"         value={gas.flow_rate} />}
        </Section>
      )}

      {/* Electrical Characteristics (QW-409) */}
      {(elec.current_type || elec.polarity || elec.current_range || elec.voltage_range ||
        elec.travel_speed || elec.heat_input || elec.tungsten_electrode_size) && (
        <Section title="Electrical Characteristics (QW-409)">
          {elec.current_type            && <Row label="Current (AC or DC)"       value={elec.current_type} />}
          {elec.polarity                && <Row label="Polarity"                 value={elec.polarity} />}
          {elec.current_range           && <Row label="Amps (Range)"             value={`${elec.current_range} A`} />}
          {elec.voltage_range           && <Row label="Volts (Range)"            value={`${elec.voltage_range} V`} />}
          {elec.tungsten_electrode_size && <Row label="Tungsten Electrode Size"  value={elec.tungsten_electrode_size} />}
          {elec.travel_speed            && <Row label="Travel Speed"             value={`${elec.travel_speed} mm/min`} />}
          {elec.heat_input              && <Row label="Heat Input"               value={`${elec.heat_input} kJ/mm`} />}
        </Section>
      )}

      {/* Per-Pass Weld Parameters (QW-409/410) */}
      {weldPasses.length > 0 && (
        <Section title="Weld Pass Parameters">
          <DataTable columns={PASS_COLS} rows={weldPasses} />
        </Section>
      )}

      {/* Technique (QW-410) */}
      {(tech.bead_type || tech.oscillation || tech.pass_type || tech.multi_single_layer ||
        tech.multi_single_electrode || tech.back_gouging || tech.contact_tube_distance ||
        tech.orifice_gas_cup_size || tech.cleaning_method || tech.electrode_spacing ||
        tech.change_of_process || tech.peening || tech.transfer_mode || tech.torch_orifice_dia ||
        tech.filler_metal_delivery || tech.use_of_thermal_process) && (
        <Section title="Technique (QW-410)">
          {tech.bead_type              && <Row label="String or Weave Bead"          value={tech.bead_type} />}
          {tech.oscillation            && <Row label="Oscillation"                    value={tech.oscillation} />}
          {tech.pass_type              && <Row label="Multi/Single Pass per Side"      value={tech.pass_type} />}
          {tech.multi_single_layer     && <Row label="Multi/Single Layer"              value={tech.multi_single_layer} />}
          {tech.multi_single_electrode && <Row label="Multi/Single Electrode"          value={tech.multi_single_electrode} />}
          {tech.contact_tube_distance  && <Row label="Contact Tube to Work Distance"    value={tech.contact_tube_distance} />}
          {tech.orifice_gas_cup_size   && <Row label="Orifice, Nozzle or Gas Cup Size"  value={tech.orifice_gas_cup_size} />}
          {tech.cleaning_method        && <Row label="Initial & Interpass Cleaning"    value={tech.cleaning_method} />}
          {tech.back_gouging           && <Row label="Method of Back Gouging"          value={tech.back_gouging} />}
          {tech.electrode_spacing      && <Row label="Electrode Spacing"               value={tech.electrode_spacing} />}
          {tech.change_of_process      && <Row label="Change of Process"               value={tech.change_of_process} />}
          {tech.peening                && <Row label="Peening"                        value={tech.peening} />}
          {tech.transfer_mode          && <Row label="Transfer Mode"                   value={tech.transfer_mode} />}
          {tech.torch_orifice_dia      && <Row label="Torch Orifice Dia."              value={tech.torch_orifice_dia} />}
          {tech.filler_metal_delivery  && <Row label="Filler Metal Delivery"           value={tech.filler_metal_delivery} />}
          {tech.use_of_thermal_process && <Row label="Use of Thermal Process"          value={tech.use_of_thermal_process} />}
        </Section>
      )}

      {/* Tensile Test Results (QW-150) */}
      {tensileTests.length > 0 && (
        <Section title="Tensile Test Results (QW-150)">
          <DataTable columns={TENSILE_COLS} rows={tensileTests} />
        </Section>
      )}

      {/* Approval */}
      <Section title="Approval">
        <Row label="Prepared & Approved By" value={record.approved_by} />
        <Row label="Reviewed By"            value={record.reviewed_by} />
        <Row label="Status"      value={badge.label} />
        <Row
          label="Created"
          value={new Date(record.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        />
        {record.notes && <Row label="Notes" value={record.notes} />}
      </Section>
    </div>
  )
}
