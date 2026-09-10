import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getSessionWithProfile } from "@/lib/auth"
import { OverlayReportForm } from "@/components/overlay/overlay-report-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  UserRole, OverlayReport, JobCard, WpsQualificationWithMaster,
  ProcessExecution, ConsumableMaster, NdeRecord, ChemicalMaster, PwhtRunJobWithRun,
} from "@/types/database"

export const metadata = { title: "Edit Overlay Welding Report — ValveTrack" }

export default async function EditOverlayReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSessionWithProfile()
  const userRole = (session?.profile?.role ?? "operator") as UserRole

  if (!["admin", "qa"].includes(userRole)) redirect("/overlay-reports")

  const supabase = await createClient()

  const { data: report } = await supabase
    .from("overlay_welding_reports")
    .select("*")
    .eq("id", id)
    .single()

  if (!report) notFound()

  const r = report as OverlayReport

  // QA cannot edit non-draft reports
  if (userRole === "qa" && r.report_status !== "draft") {
    redirect(`/overlay-reports/${id}`)
  }

  const jobCardId = r.job_card_id

  const [
    { data: jobCard },
    { data: wpsQuals },
    { data: executions },
    { data: consumables },
    { data: ndeRecords },
    { data: chemicals },
    { data: pwhtJobs },
  ] = await Promise.all([
    supabase.from("job_cards").select("*, client:clients(id, name)").eq("id", jobCardId).single(),
    supabase
      .from("wps_qualifications")
      .select("*, wps_master:wps_master(id,wps_no,pqr_no,welding_process,filler_material,filler_aws_class,filler_size,preheat_min,interpass_max,pwht_required,pwht_temp_min,pwht_temp_max,electrical_params_json,revision,status)")
      .eq("job_card_id", jobCardId)
      .order("uploaded_at"),
    supabase.from("process_executions").select("*").eq("job_card_id", jobCardId).order("started_at"),
    supabase.from("consumable_master").select("*").eq("is_active", true),
    supabase.from("nde_records").select("*").eq("job_card_id", jobCardId).order("created_at"),
    supabase.from("chemical_master").select("*").eq("is_active", true),
    supabase.from("pwht_run_jobs").select("*, pwht_run:pwht_runs(*)").eq("job_card_id", jobCardId).order("created_at"),
  ])

  if (!jobCard) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/overlay-reports/${id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Back to Report
        </Link>
        <span className="text-muted-foreground text-sm">/ Edit</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold">Edit Overlay Welding Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Job Card: <span className="font-medium text-foreground">{(jobCard as JobCard).jc_number}</span>
        </p>
      </div>
      <OverlayReportForm
        jobCardId={jobCardId}
        jobCard={jobCard as JobCard & { client?: { name?: string } }}
        report={r}
        wpsQuals={(wpsQuals ?? []) as WpsQualificationWithMaster[]}
        executions={(executions ?? []) as ProcessExecution[]}
        consumables={(consumables ?? []) as ConsumableMaster[]}
        ndeRecords={(ndeRecords ?? []) as NdeRecord[]}
        chemicals={(chemicals ?? []) as ChemicalMaster[]}
        pwhtJobs={(pwhtJobs ?? []) as PwhtRunJobWithRun[]}
      />
    </div>
  )
}
