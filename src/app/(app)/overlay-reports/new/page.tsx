import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getSessionWithProfile } from "@/lib/auth"
import { OverlayReportForm } from "@/components/overlay/overlay-report-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  UserRole, JobCard, WpsQualificationWithMaster,
  ProcessExecution, ConsumableMaster, NdeRecord, ChemicalMaster, PwhtRunJobWithRun,
} from "@/types/database"

export const metadata = { title: "New Overlay Welding Report — ValveTrack" }

export default async function NewOverlayReportPage({
  searchParams,
}: {
  searchParams: Promise<{ job_card_id?: string }>
}) {
  const { job_card_id } = await searchParams
  const session = await getSessionWithProfile()
  const userRole = (session?.profile?.role ?? "operator") as UserRole

  if (!["admin", "qa"].includes(userRole)) redirect("/overlay-reports")

  const supabase = await createClient()

  if (!job_card_id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/overlay-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
            <ChevronLeft className="h-4 w-4" /> Overlay Reports
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          No Job Card selected. Please open a Job Card and click &quot;New Overlay Report&quot;.
        </p>
      </div>
    )
  }

  const [
    { data: jobCard },
    { data: wpsQuals },
    { data: executions },
    { data: consumables },
    { data: ndeRecords },
    { data: chemicals },
    { data: pwhtJobs },
    { data: dimReports },
  ] = await Promise.all([
    supabase
      .from("job_cards")
      .select("*, client:clients(id, name)")
      .eq("id", job_card_id)
      .single(),
    supabase
      .from("wps_qualifications")
      .select("*, wps_master:wps_master(id,wps_no,pqr_no,welding_process,filler_material,filler_aws_class,filler_size,preheat_min,interpass_max,pwht_required,pwht_temp_min,pwht_temp_max,electrical_params_json,revision,status)")
      .eq("job_card_id", job_card_id)
      .order("uploaded_at"),
    supabase
      .from("process_executions")
      .select("*")
      .eq("job_card_id", job_card_id)
      .order("started_at"),
    supabase
      .from("consumable_master")
      .select("*")
      .eq("is_active", true),
    supabase
      .from("nde_records")
      .select("*")
      .eq("job_card_id", job_card_id)
      .order("created_at"),
    supabase
      .from("chemical_master")
      .select("*")
      .eq("is_active", true),
    supabase
      .from("pwht_run_jobs")
      .select("*, pwht_run:pwht_runs(*)")
      .eq("job_card_id", job_card_id)
      .order("created_at"),
    supabase
      .from("dimension_reports")
      .select("report_number")
      .eq("job_card_id", job_card_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ])

  if (!jobCard) notFound()

  const firstDimReportNumber = (dimReports?.[0] as { report_number?: string | null } | undefined)?.report_number ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/overlay-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Overlay Reports
        </Link>
        <span className="text-muted-foreground text-sm">/ New Report</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold">New Overlay Welding Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Job Card: <span className="font-medium text-foreground">{(jobCard as JobCard).jc_number}</span>
        </p>
      </div>
      <OverlayReportForm
        jobCardId={job_card_id}
        jobCard={jobCard as JobCard & { client?: { name?: string } }}
        report={null}
        wpsQuals={(wpsQuals ?? []) as WpsQualificationWithMaster[]}
        executions={(executions ?? []) as ProcessExecution[]}
        consumables={(consumables ?? []) as ConsumableMaster[]}
        ndeRecords={(ndeRecords ?? []) as NdeRecord[]}
        chemicals={(chemicals ?? []) as ChemicalMaster[]}
        pwhtJobs={(pwhtJobs ?? []) as PwhtRunJobWithRun[]}
        dimReportNumber={firstDimReportNumber}
      />
    </div>
  )
}
