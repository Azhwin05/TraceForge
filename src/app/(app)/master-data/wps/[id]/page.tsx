import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WpsApproveActions } from "@/components/master-data/wps-approve-actions"
import { DocumentCard } from "@/components/documents/document-card"
import { FileUpload } from "@/components/documents/file-upload"
import { cn } from "@/lib/utils"
import type { WpsMaster, WpsMasterStatus, UserRole, Document } from "@/types/database"

export const metadata = { title: "WPS Detail — ValveTrack" }
export const revalidate = 30

const STATUS_BADGE: Record<WpsMasterStatus, { label: string; className: string }> = {
  draft:      { label: "Draft",      className: "bg-amber-100 text-amber-700" },
  approved:   { label: "Approved",   className: "bg-green-100 text-green-700" },
  superseded: { label: "Superseded", className: "bg-slate-100 text-slate-600" },
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

  const gas  = (record.gas_json  ?? {}) as Record<string, string>
  const elec = (record.electrical_params_json ?? {}) as Record<string, string>
  const tech = (record.technique_json ?? {}) as Record<string, string>

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
              <h1 className="text-2xl font-bold font-mono tracking-tight">{record.wps_no}</h1>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.className)}>
                {badge.label}
              </span>
            </div>
            {record.pqr_no && (
              <p className="text-sm text-muted-foreground">PQR: {record.pqr_no}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
        {record.scope && <Row label="Scope" value={record.scope} />}
      </Section>

      {/* Materials */}
      <Section title="Materials & Joint">
        <Row label="Joint Design"     value={record.joint_design} />
        <Row label="Position"         value={record.position} />
        <Row label="Base Material"    value={record.base_material} />
        <Row label="Filler Material"  value={record.filler_material} />
        <Row label="Filler AWS Class" value={record.filler_aws_class} />
        <Row label="Filler Size"      value={record.filler_size} />
      </Section>

      {/* Temperature */}
      <Section title="Temperature Parameters">
        <Row label="Preheat Min"   value={record.preheat_min != null ? `${record.preheat_min} °C` : null} />
        <Row label="Interpass Max" value={record.interpass_max != null ? `${record.interpass_max} °C` : null} />
      </Section>

      {/* PWHT */}
      <Section title="PWHT">
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
            <Row label="Time Range" value={record.pwht_time_range} />
          </>
        )}
      </Section>

      {/* Electrical */}
      {(elec.polarity || elec.current_range || elec.voltage_range || elec.travel_speed || elec.heat_input) && (
        <Section title="Electrical Parameters">
          {elec.polarity       && <Row label="Polarity"       value={elec.polarity} />}
          {elec.current_range  && <Row label="Current Range"  value={`${elec.current_range} A`} />}
          {elec.voltage_range  && <Row label="Voltage Range"  value={`${elec.voltage_range} V`} />}
          {elec.travel_speed   && <Row label="Travel Speed"   value={`${elec.travel_speed} mm/min`} />}
          {elec.heat_input     && <Row label="Heat Input"     value={`${elec.heat_input} kJ/mm`} />}
        </Section>
      )}

      {/* Gas */}
      {(gas.shielding || gas.backing) && (
        <Section title="Gas">
          {gas.shielding && <Row label="Shielding Gas" value={gas.shielding} />}
          {gas.backing   && <Row label="Backing Gas"   value={gas.backing} />}
        </Section>
      )}

      {/* Technique */}
      {(tech.bead_type || tech.oscillation || tech.pass_type || tech.back_gouging) && (
        <Section title="Technique">
          {tech.bead_type    && <Row label="Bead Type"    value={tech.bead_type} />}
          {tech.oscillation  && <Row label="Oscillation"  value={tech.oscillation} />}
          {tech.pass_type    && <Row label="Pass Type"    value={tech.pass_type} />}
          {tech.back_gouging && <Row label="Back Gouging" value={tech.back_gouging} />}
        </Section>
      )}

      {/* Approval */}
      <Section title="Approval">
        <Row label="Approved By" value={record.approved_by} />
        <Row label="Reviewed By" value={record.reviewed_by} />
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
