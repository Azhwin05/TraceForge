import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { DimensionReportForm } from "@/components/dimension/dimension-report-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole, DimensionReport, JobCard, InstrumentMaster } from "@/types/database"

export const metadata = { title: "Edit Dimension Report — ValveTrack" }

export default async function EditDimensionReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  if (!["admin", "qa"].includes(userRole)) redirect(`/dimension-reports/${id}`)

  const { data: report, error } = await supabase
    .from("dimension_reports")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !report) notFound()

  const r = report as DimensionReport

  // QA cannot edit non-draft reports
  if (userRole === "qa" && r.dimension_status !== "draft") {
    redirect(`/dimension-reports/${id}`)
  }

  const [{ data: jobCard }, { data: instruments }] = await Promise.all([
    supabase.from("job_cards").select("*").eq("id", r.job_card_id).single(),
    supabase.from("instrument_master").select("*").eq("is_active", true).order("instrument_name"),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/dimension-reports/${id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Back to Report
        </Link>
        <span className="text-muted-foreground text-sm">/ Edit</span>
      </div>
      <div>
        <h1 className="text-xl font-bold">Edit Dimension Report</h1>
        <p className="text-muted-foreground text-sm mt-1">{r.report_number}</p>
      </div>
      <DimensionReportForm
        jobCardId={r.job_card_id}
        jobCard={(jobCard ?? null) as JobCard | null}
        report={r}
        instruments={(instruments ?? []) as InstrumentMaster[]}
      />
    </div>
  )
}
