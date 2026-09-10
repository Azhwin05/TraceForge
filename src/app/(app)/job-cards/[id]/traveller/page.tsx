import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { isValidUUID } from "@/lib/security"
import { PrintButton } from "@/components/job-cards/print-button"
import { must, orEmpty } from "@/lib/db"
import { STATUS_LABEL } from "@/lib/portal/status"
import type { JobCardStatus, ReworkStatus } from "@/types/database"

export const metadata = { title: "Travel Card — ValveTrack" }

/**
 * Job Travel Card (client meeting request #1).
 *
 * One page that follows the job through its whole lifecycle: identity, tags,
 * every routed operation with who did it and when, inspection results, heat
 * treatment, rework, and dispatch. Printed and physically travels with the job.
 *
 * Deliberately a print-styled HTML page rather than a second @react-pdf
 * template: the existing job-card PDF already covers the formal document, and
 * duplicating that machinery for a shop-floor traveller would mean two
 * templates to keep in step with the schema. Ctrl+P here produces the same
 * artefact with far less to go wrong.
 */
export default async function TravellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isValidUUID(id)) notFound()

  const { supabase } = await requireAuth()

  const jcRes = await supabase
    .from("job_cards")
    .select("*, client:clients(name)")
    .eq("id", id)
    .maybeSingle()

  const jc = must(jcRes, "this job card")
  if (!jc) notFound()

  const [execRes, pmiRes, dimRes, overlayRes, reworkRes, pwhtRes, dispatchRes] = await Promise.all([
    supabase.from("process_executions")
      .select("id, operation_type, process_type, sequence_no, status, started_at, completed_at, welder_name, welder_id, machine:machines(machine_code, name)")
      .eq("job_card_id", id)
      .order("sequence_no", { ascending: true, nullsFirst: false }),
    supabase.from("pmi_reports").select("id, report_number, pmi_status, result, report_date").eq("job_card_id", id),
    supabase.from("dimension_reports").select("id, report_number, dimension_status, result_status, report_date").eq("job_card_id", id),
    supabase.from("overlay_welding_reports").select("id, report_number, report_status, result_status, report_date").eq("job_card_id", id),
    supabase.from("rework_records").select("id, rework_date, stage, reason, quantity, status, corrective_action").eq("job_card_id", id).order("rework_date"),
    supabase.from("pwht_run_jobs").select("pwht_runs(chart_number, approval_status, date_of_cycle)").eq("job_card_id", id),
    supabase.from("dispatches").select("id, dc_number, dispatch_date, vehicle_details, lr_number").eq("job_card_id", id).order("dispatch_date"),
  ])

  // orEmpty throughout: a traveller that prints with one section missing is far
  // better than one that refuses to print at all — but every failure is logged.
  const executions = orEmpty(execRes, "operations for the travel card")
  const pmi        = orEmpty(pmiRes, "PMI reports for the travel card")
  const dim        = orEmpty(dimRes, "dimension reports for the travel card")
  const overlay    = orEmpty(overlayRes, "overlay reports for the travel card")
  const rework     = orEmpty(reworkRes, "rework records for the travel card")
  const pwhtRows   = orEmpty(pwhtRes, "heat treatment for the travel card")
  const dispatches = orEmpty(dispatchRes, "dispatch records for the travel card")

  const pwht = (pwhtRows as unknown as Array<{ pwht_runs: { chart_number: string; approval_status: string; date_of_cycle: string | null } | null }>)
    .map((r) => r.pwht_runs)
    .filter((r): r is NonNullable<typeof r> => !!r)

  const tags = (jc as unknown as { tags?: string[] }).tags ?? []
  const client = (jc as unknown as { client?: { name?: string } | null }).client

  return (
    <div className="mx-auto max-w-4xl space-y-5 print:max-w-none print:space-y-3">
      {/* Screen-only controls */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/job-cards/${id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to job card
        </Link>
        <PrintButton label="Print Travel Card" />
      </div>

      <header className="border-b-2 border-foreground pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">TRAVEL CARD</h1>
            <p className="text-sm text-muted-foreground">Raghav Engineering</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold">{jc.jc_number}</p>
            <p className="text-sm">{STATUS_LABEL[jc.status as JobCardStatus] ?? jc.status}</p>
          </div>
        </div>
      </header>

      <Section title="Job Identity">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
          <Item label="Client"    value={client?.name} />
          <Item label="NBDN"      value={jc.nbdn_number} />
          <Item label="PO Number" value={jc.po_number} />
          <Item label="Drawing"   value={jc.drawing_number} />
          <Item label="Heat No."  value={jc.heat_number} />
          <Item label="Part No."  value={jc.part_number} />
          <Item label="Quantity"  value={String(jc.quantity)} />
          <Item label="Received"  value={fmtDate(jc.received_date)} />
        </dl>
        <p className="mt-2 text-sm"><span className="font-medium">Description: </span>{jc.description}</p>
        {tags.length > 0 && (
          <p className="mt-1.5 text-sm">
            <span className="font-medium">Tags: </span>
            {tags.join(" · ")}
          </p>
        )}
      </Section>

      <Section title="Operations">
        {executions.length === 0 ? (
          <Empty>No operations routed.</Empty>
        ) : (
          <Table head={["#", "Operation", "Status", "Started", "Completed", "By / Machine"]}>
            {(executions as Array<Record<string, unknown>>).map((e) => {
              const machine = e.machine as { machine_code?: string } | null
              return (
                <tr key={String(e.id)} className="border-b last:border-0">
                  <Td>{e.sequence_no != null ? String(e.sequence_no) : "—"}</Td>
                  <Td className="capitalize">{String(e.operation_type ?? e.process_type ?? "—").replace(/_/g, " ")}</Td>
                  <Td className="capitalize">{String(e.status ?? "—").replace(/_/g, " ")}</Td>
                  <Td>{fmtDate(e.started_at as string | null)}</Td>
                  <Td>{fmtDate(e.completed_at as string | null)}</Td>
                  <Td>
                    {[e.welder_name, e.welder_id, machine?.machine_code]
                      .filter(Boolean).join(" / ") || "—"}
                  </Td>
                </tr>
              )
            })}
          </Table>
        )}
      </Section>

      <Section title="Inspection &amp; Quality">
        {pmi.length + dim.length + overlay.length === 0 ? (
          <Empty>No inspection reports recorded.</Empty>
        ) : (
          <Table head={["Type", "Report No.", "Date", "Status", "Result"]}>
            {[
              ...(pmi as Array<Record<string, unknown>>).map((r) => ({
                type: "PMI", num: r.report_number, date: r.report_date,
                status: r.pmi_status, result: r.result,
              })),
              ...(dim as Array<Record<string, unknown>>).map((r) => ({
                type: "Dimension", num: r.report_number, date: r.report_date,
                status: r.dimension_status, result: r.result_status,
              })),
              ...(overlay as Array<Record<string, unknown>>).map((r) => ({
                type: "Overlay Welding", num: r.report_number, date: r.report_date,
                status: r.report_status, result: r.result_status,
              })),
            ].map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <Td>{r.type}</Td>
                <Td className="font-mono">{(r.num as string) ?? "—"}</Td>
                <Td>{fmtDate(r.date as string | null)}</Td>
                <Td className="capitalize">{String(r.status ?? "—").replace(/_/g, " ")}</Td>
                <Td className="capitalize">{String(r.result ?? "—").replace(/_/g, " ")}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Heat Treatment (PWHT)">
        {pwht.length === 0 ? (
          <Empty>No heat treatment recorded.</Empty>
        ) : (
          <Table head={["Chart No.", "Date of Cycle", "Approval"]}>
            {pwht.map((r) => (
              <tr key={r.chart_number} className="border-b last:border-0">
                <Td className="font-mono">{r.chart_number}</Td>
                <Td>{fmtDate(r.date_of_cycle)}</Td>
                <Td className="capitalize">{r.approval_status.replace(/_/g, " ")}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Rework">
        {rework.length === 0 ? (
          <Empty>No rework recorded — first-time pass.</Empty>
        ) : (
          <Table head={["Date", "Stage", "Qty", "Reason", "Corrective Action", "Status"]}>
            {(rework as Array<Record<string, unknown>>).map((r) => (
              <tr key={String(r.id)} className="border-b last:border-0">
                <Td>{fmtDate(r.rework_date as string)}</Td>
                <Td>{String(r.stage)}</Td>
                <Td>{String(r.quantity)}</Td>
                <Td>{String(r.reason)}</Td>
                <Td>{(r.corrective_action as string) ?? "—"}</Td>
                <Td className="capitalize">{String(r.status as ReworkStatus).replace(/_/g, " ")}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Dispatch">
        {dispatches.length === 0 ? (
          <Empty>Not yet dispatched.</Empty>
        ) : (
          <Table head={["DC No.", "Date", "Vehicle", "LR No."]}>
            {(dispatches as Array<Record<string, unknown>>).map((d) => (
              <tr key={String(d.id)} className="border-b last:border-0">
                <Td className="font-mono">{String(d.dc_number)}</Td>
                <Td>{fmtDate(d.dispatch_date as string)}</Td>
                <Td>{(d.vehicle_details as string) ?? "—"}</Td>
                <Td>{(d.lr_number as string) ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <div className="grid grid-cols-3 gap-6 border-t-2 border-foreground pt-6 text-sm">
        {["Production", "Quality", "Stores"].map((role) => (
          <div key={role}>
            <div className="h-12 border-b border-foreground" />
            <p className="mt-1 text-center text-xs">{role} — Sign &amp; Date</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground print:mt-2">
        Printed {new Date().toLocaleString("en-IN")} · ValveTrack
      </p>
    </div>
  )
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-1.5 border-b border-border pb-1 text-sm font-bold uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1.5 text-sm text-muted-foreground">{children}</p>
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-1.5 pr-3 align-top ${className}`}>{children}</td>
}
