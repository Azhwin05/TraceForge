import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react"
import { requireCustomer } from "@/lib/auth"
import { isValidUUID } from "@/lib/security"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PortalDocList } from "@/components/portal/portal-doc-list"
import { STATUS_ORDER, STATUS_LABEL, statusBadgeClass } from "@/lib/portal/status"
import type { JobCardStatus } from "@/types/database"

export const metadata = { title: "Job Detail — ValveTrack" }

export default async function PortalJobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isValidUUID(id)) notFound()

  const { supabase } = await requireCustomer()

  // RLS: a customer can only read their own client's job; a guessed id returns nothing.
  const { data: job } = await supabase
    .from("job_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!job) notFound()
  const status = job.status as JobCardStatus

  const [{ data: docs }, { data: pmi }, { data: dim }, { data: overlay }, { data: dispatches }, { data: prj }] =
    await Promise.all([
      supabase.from("documents").select("id, document_name, document_type, file_name, storage_path, version, uploaded_at")
        .eq("job_card_id", id).eq("is_active", true).eq("is_latest", true).order("uploaded_at", { ascending: false }),
      supabase.from("pmi_reports").select("id, pmi_status, created_at").eq("job_card_id", id),
      supabase.from("dimension_reports").select("id, dimension_status, created_at").eq("job_card_id", id),
      supabase.from("overlay_welding_reports").select("id, report_number, report_status, created_at").eq("job_card_id", id),
      supabase.from("dispatches").select("id, dc_number, dispatch_date, vehicle_details").eq("job_card_id", id).order("dispatch_date", { ascending: false }),
      supabase.from("pwht_run_jobs").select("pwht_runs(id, chart_number, approval_status, date_of_cycle)").eq("job_card_id", id),
    ])

  const pwhtRuns = ((prj ?? []) as unknown as Array<{ pwht_runs: { id: string; chart_number: string; approval_status: string; date_of_cycle: string | null } | null }>)
    .map((r) => r.pwht_runs).filter(Boolean) as Array<{ id: string; chart_number: string; approval_status: string; date_of_cycle: string | null }>

  const currentIdx = STATUS_ORDER.indexOf(status)

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  )

  const reportRows: Array<{ type: string; num: string | null; status: string }> = [
    ...((pmi ?? []) as Array<{ id: string; pmi_status: string }>).map((r) => ({ type: "PMI Report", num: null, status: r.pmi_status })),
    ...((dim ?? []) as Array<{ id: string; dimension_status: string }>).map((r) => ({ type: "Dimension Report", num: null, status: r.dimension_status })),
    ...((overlay ?? []) as Array<{ id: string; report_number: string | null; report_status: string }>).map((r) => ({ type: "Overlay Welding Report", num: r.report_number, status: r.report_status })),
    ...pwhtRuns.map((r) => ({ type: "PWHT / Heat Treatment", num: r.chart_number, status: r.approval_status })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/jobs" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="font-mono text-xl font-semibold">{job.jc_number}</h1>
        <Badge className={statusBadgeClass(status)}>{STATUS_LABEL[status]}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Description" value={job.description} />
          <Field label="PO Number" value={job.po_number} />
          <Field label="Drawing No." value={job.drawing_number} />
          <Field label="Heat No." value={job.heat_number} />
          <Field label="Part No." value={job.part_number} />
          <Field label="Quantity" value={job.quantity} />
          <Field label="Received" value={new Date(job.received_date).toLocaleDateString()} />
          <Field label="Process" value={(job.process_type as string[]).join(", ")} />
        </CardContent>
      </Card>

      {/* Process timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Process Status</CardTitle></CardHeader>
        <CardContent>
          {status === "on_hold" ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              This job is currently <strong>On Hold</strong>. Please contact Raghav Engineering for details.
            </div>
          ) : (
            <ol className="grid gap-2 sm:grid-cols-2">
              {STATUS_ORDER.map((s, i) => {
                const done = i < currentIdx
                const current = i === currentIdx
                return (
                  <li key={s} className={`flex items-center gap-2 text-sm ${current ? "font-semibold" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                    {done || current
                      ? <CheckCircle2 className={`h-4 w-4 ${current ? "text-blue-600" : "text-green-600"}`} />
                      : <Circle className="h-4 w-4" />}
                    {STATUS_LABEL[s]}
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Inspection & QC */}
      <Card>
        <CardHeader><CardTitle className="text-base">Inspection &amp; Quality Reports</CardTitle></CardHeader>
        <CardContent>
          {reportRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inspection reports recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Report</th><th className="p-2">Number</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {reportRows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">{r.type}</td>
                    <td className="p-2 font-mono">{r.num ?? "—"}</td>
                    <td className="p-2">
                      <Badge className={r.status === "approved" || r.status === "submitted" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dispatch */}
      {dispatches && dispatches.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Dispatch</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(dispatches as Array<{ id: string; dc_number: string; dispatch_date: string; vehicle_details: string | null }>).map((d) => (
              <div key={d.id} className="rounded-md border p-3">
                <Field label="DC Number" value={d.dc_number} />
                <div className="mt-2"><Field label="Date" value={new Date(d.dispatch_date).toLocaleDateString()} /></div>
                {d.vehicle_details && <div className="mt-2"><Field label="Vehicle" value={d.vehicle_details} /></div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
        <CardContent>
          <PortalDocList
            docs={(docs ?? []) as Array<{ id: string; document_name: string | null; document_type: string; file_name: string; storage_path: string; version: number }>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
