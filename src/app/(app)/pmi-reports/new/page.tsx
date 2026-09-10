import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { PmiReportForm } from "@/components/pmi/pmi-report-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InstrumentMaster } from "@/types/database"

export default async function NewPmiReportPage({
  searchParams,
}: {
  searchParams: { job_card_id?: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "qa"].includes(profile?.role ?? "")) {
    redirect("/pmi-reports")
  }

  const jobCardId = searchParams.job_card_id
  if (!jobCardId) {
    redirect("/pmi-reports")
  }

  // Fetch job card basics for breadcrumb
  const { data: jobCard } = await supabase
    .from("job_cards")
    .select("id, jc_number, drawing_number, heat_number")
    .eq("id", jobCardId)
    .single()

  if (!jobCard) redirect("/job-cards")

  // Fetch instruments for auto-fill dropdown
  const { data: instruments } = await supabase
    .from("instrument_master")
    .select("id, instrument_name, serial_number, calibration_due")
    .eq("is_active", true)
    .in("instrument_type", ["pmi", "other"])
    .order("instrument_name")

  const defaultValues = {
    drawing_number: (jobCard as { drawing_number?: string | null }).drawing_number ?? "",
    heat_no:        (jobCard as { heat_number?: string | null }).heat_number ?? "",
    report_date:    new Date().toISOString().split("T")[0],
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/job-cards/${jobCardId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Job Card {(jobCard as { jc_number: string }).jc_number}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">New PMI Report</h1>
      <PmiReportForm
        mode="create"
        jobCardId={jobCardId}
        defaultValues={defaultValues}
        instruments={(instruments as InstrumentMaster[] | null) ?? []}
      />
    </div>
  )
}
