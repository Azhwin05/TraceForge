import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, User, Layers } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getSessionWithProfile } from "@/lib/auth"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { StatusTimeline } from "@/components/job-cards/status-timeline"
import { StatusActions } from "@/components/job-cards/status-actions"
import { DueDateEditor } from "@/components/job-cards/due-date-editor"
import { WpsSection } from "@/components/job-cards/wps-section"
import { ProcessExecutionSection } from "@/components/job-cards/process-execution-section"
import { DispatchSection } from "@/components/job-cards/dispatch-section"
import { AccountsSection } from "@/components/job-cards/accounts-section"
import { PmiReportSection } from "@/components/job-cards/pmi-report-section"
import { DimensionReportSection } from "@/components/job-cards/dimension-report-section"
import { OverlayReportSection } from "@/components/job-cards/overlay-report-section"
import { AdvancedDetailsSection } from "@/components/job-cards/advanced-details-section"
import { NdeLptSection } from "@/components/job-cards/nde-lpt-section"
import { AirTestSection } from "@/components/job-cards/air-test-section"
import { JobCardPdfButton } from "@/components/job-cards/job-card-pdf-button"
import { PwhtSummarySection } from "@/components/job-cards/pwht-summary-section"
import { SignOffSection } from "@/components/job-cards/sign-off-section"
import { JobCardDocumentsSection } from "@/components/job-cards/job-card-documents-section"
import { DossierSection } from "@/components/job-cards/dossier-section"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  JobCard, JobCardDetail, UserRole, ProcessType, Document,
  WpsQualificationWithMaster, WpsMasterSummary,
  NdeRecord, ChemicalMaster, PwhtRunJobWithRun,
  ConsumableMaster, DossierStatus, AirTestRecord, Machine,
} from "@/types/database"

export const metadata = { title: "Job Card — ValveTrack" }
export const revalidate = 30

const PROCESS_LABELS: Record<ProcessType, string> = {
  welding: "Welding", machining: "Machining", cladding: "Cladding", overlay: "Overlay",
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  )
}

type PmiSummary = {
  id: string
  report_number: string | null
  pmi_status: "draft" | "approved" | "rejected" | "submitted"
  result: "acceptable" | "not_acceptable"
}

type DimSummary = {
  id: string
  report_number: string | null
  dimension_status: "draft" | "approved" | "rejected" | "submitted"
  result_status: "accepted" | "rejected" | "hold" | null
}

type OverlaySummary = {
  id: string
  report_number: string | null
  report_status: "draft" | "approved" | "rejected" | "submitted"
  result_status: "accepted" | "rejected" | "hold" | null
}

type DossierSummary = {
  id: string
  dossier_number: string
  dossier_date: string
  status: DossierStatus
  submitted_to_customer: boolean
  submitted_at: string | null
}

export default async function JobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: jobCard },
    session,
    { data: jobCardDocs },
    { data: ndeRecords },
    { data: airTestRecords },
    { data: pwhtJobs },
    { data: wpsMasters },
    { data: consumables },
    { data: chemicals },
    { data: pmiReports },
    { data: dimensionReports },
    { data: overlayReports },
    { data: dossierRows },
    { data: machines },
  ] = await Promise.all([
    supabase
      .from("job_cards")
      .select(`
        *,
        client:clients(*),
        creator:profiles!created_by(id, full_name),
        wps_qualifications(*, wps_master:wps_master(id,wps_no,pqr_no,welding_process,filler_material,filler_aws_class,filler_size,preheat_min,interpass_max,pwht_required,pwht_temp_min,pwht_temp_max,electrical_params_json,revision,status)),
        process_executions(*),
        dispatches(*),
        accounts(*)
      `)
      .eq("id", id)
      .single(),
    getSessionWithProfile(),
    supabase
      .from("documents")
      .select("*")
      .eq("job_card_id", id)
      .eq("is_active", true)
      .eq("is_latest", true)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("nde_records")
      .select("*")
      .eq("job_card_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("air_test_records")
      .select("*")
      .eq("job_card_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("pwht_run_jobs")
      .select("*, pwht_run:pwht_runs(*)")
      .eq("job_card_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("wps_master")
      .select("id,wps_no,pqr_no,welding_process,filler_material,filler_aws_class,filler_size,preheat_min,interpass_max,pwht_required,pwht_temp_min,pwht_temp_max,electrical_params_json,revision,status")
      .eq("status", "approved")
      .order("wps_no"),
    supabase
      .from("consumable_master")
      .select("*")
      .eq("is_active", true)
      .order("brand"),
    supabase
      .from("chemical_master")
      .select("*")
      .eq("is_active", true)
      .order("chemical_name"),
    supabase
      .from("pmi_reports")
      .select("id, report_number, pmi_status, result")
      .eq("job_card_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("dimension_reports")
      .select("id, report_number, dimension_status, result_status")
      .eq("job_card_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("overlay_welding_reports")
      .select("id, report_number, report_status, result_status")
      .eq("job_card_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_dossiers")
      .select("id, dossier_number, dossier_date, status, submitted_to_customer, submitted_at")
      .eq("job_card_id", id)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("machines")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("machine_code"),
  ])

  if (!jobCard) notFound()
  if (!session) notFound()

  const userRole = (session.profile?.role ?? "operator") as UserRole
  // Cast to JobCardDetail (process_executions, dispatches, accounts are properly typed there)
  // Override wps_qualifications to the richer type that includes wps_master join
  const jc = jobCard as unknown as JobCardDetail & {
    wps_qualifications: WpsQualificationWithMaster[]
  }

  const allDocs = (jobCardDocs ?? []) as Document[]
  const pmiDocs = allDocs.filter((d) => d.document_type === "pmi_report")
  const dimensionDocs = allDocs.filter((d) => d.document_type === "dimension_report")
  const overlayDocs = allDocs.filter((d) => d.document_type === "overlay_welding_report")

  const daysAtStage = Math.floor(
    (Date.now() - new Date(jc.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const wpsQuals = (jc.wps_qualifications ?? []) as WpsQualificationWithMaster[]
  // wps_master join selects full WpsMasterSummary fields; cast to access pwht_required
  const pwhtRequired = wpsQuals.some(
    (q) => (q.wps_master as WpsMasterSummary | null)?.pwht_required === true
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          href="/job-cards"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Job Cards
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{jc.jc_number}</h1>
              <StatusBadge status={jc.status} className="text-sm px-2.5 py-1" />
              {daysAtStage > 0 && (
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {daysAtStage}d at this stage
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {jc.client?.name} · NBDN: {jc.nbdn_number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <JobCardPdfButton jobCardId={jc.id} />
            <StatusActions
              jobCardId={jc.id}
              currentStatus={jc.status}
              previousStatus={jc.previous_status}
              userRole={userRole}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <StatusTimeline status={jc.status} />
        </CardContent>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Job Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" /> Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="Description" value={jc.description} />
            <InfoRow label="Client" value={jc.client?.name} />
            <InfoRow label="PO Number" value={jc.po_number} />
            <InfoRow label="Drawing No." value={jc.drawing_number} />
            <InfoRow label="Heat No." value={jc.heat_number} />
            <InfoRow label="Part No." value={jc.part_number} />
            <InfoRow label="Quantity" value={jc.quantity} />
            <InfoRow
              label="Process Types"
              value={
                <div className="flex flex-wrap gap-1">
                  {jc.process_type.map((t: string) => (
                    <span key={t} className="text-xs bg-muted rounded px-1.5 py-0.5">
                      {PROCESS_LABELS[t as ProcessType]}
                    </span>
                  ))}
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Tracking Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow
              label="NBDN Number"
              value={<span className="font-mono">{jc.nbdn_number}</span>}
            />
            <InfoRow
              label="Received Date"
              value={new Date(jc.received_date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            />
            <DueDateEditor
              jobCardId={jc.id}
              dueDate={jc.due_date}
              createdAt={jc.created_at}
              status={jc.status}
              canEdit={["admin", "operator", "engineer"].includes(userRole)}
            />
            <InfoRow
              label="Created"
              value={new Date(jc.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            />
            <InfoRow
              label="Stage Since"
              value={new Date(jc.stage_entered_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            />
            <InfoRow
              label="Created By"
              value={
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {jc.creator?.full_name ?? "—"}
                </span>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Product / Material Details */}
      <AdvancedDetailsSection jobCard={jc as unknown as JobCard} userRole={userRole} />

      {/* WPS Section */}
      <WpsSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        wpsRecords={wpsQuals}
        wpsMasters={(wpsMasters ?? []) as WpsMasterSummary[]}
      />

      {/* Process Execution Section */}
      <ProcessExecutionSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        processTypes={jc.process_type as ProcessType[]}
        executions={jc.process_executions ?? []}
        consumables={(consumables ?? []) as ConsumableMaster[]}
        machines={(machines ?? []) as Machine[]}
      />

      {/* NDE / LPT Section */}
      <NdeLptSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        records={(ndeRecords ?? []) as NdeRecord[]}
        chemicals={(chemicals ?? []) as ChemicalMaster[]}
      />

      {/* Air Testing & Inspection */}
      <AirTestSection
        jobCardId={jc.id}
        userRole={userRole}
        records={(airTestRecords ?? []) as AirTestRecord[]}
      />

      {/* PWHT Summary */}
      <PwhtSummarySection
        pwhtJobs={(pwhtJobs ?? []) as PwhtRunJobWithRun[]}
        pwhtRequired={pwhtRequired}
      />

      {/* PMI Report Section */}
      <PmiReportSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        documents={pmiDocs}
        pmiReports={(pmiReports ?? []) as PmiSummary[]}
      />

      {/* Dimension Report Section */}
      <DimensionReportSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        documents={dimensionDocs}
        dimensionReports={(dimensionReports ?? []) as DimSummary[]}
      />

      {/* Overlay Welding Report Section */}
      <OverlayReportSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        documents={overlayDocs}
        overlayReports={(overlayReports ?? []) as OverlaySummary[]}
      />

      {/* Customer Submission Dossiers */}
      <DossierSection
        jobCardId={jc.id}
        userRole={userRole}
        dossiers={(dossierRows ?? []) as DossierSummary[]}
      />

      {/* All Documents */}
      <JobCardDocumentsSection documents={allDocs} />

      {/* Production Sign-Off */}
      <SignOffSection jobCard={jc as unknown as JobCard} userRole={userRole} />

      {/* Dispatch Section */}
      <DispatchSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        dispatches={jc.dispatches ?? []}
      />

      {/* Accounts Section */}
      <AccountsSection
        jobCardId={jc.id}
        status={jc.status}
        userRole={userRole}
        account={Array.isArray(jc.accounts) ? (jc.accounts[0] ?? null) : (jc.accounts ?? null)}
      />
    </div>
  )
}
