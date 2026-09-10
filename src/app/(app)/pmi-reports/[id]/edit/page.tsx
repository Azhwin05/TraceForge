import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { PmiReportForm } from "@/components/pmi/pmi-report-form"
import { pmiReportToFormValues } from "@/lib/form-mappers/pmi-report"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PmiReport, InstrumentMaster } from "@/types/database"

export default async function EditPmiReportPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "qa"].includes(profile?.role ?? "")) {
    redirect(`/pmi-reports/${params.id}`)
  }

  const { data: report, error } = await supabase
    .from("pmi_reports")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !report) notFound()

  const r = report as PmiReport

  if (profile?.role === "qa" && r.pmi_status !== "draft") {
    redirect(`/pmi-reports/${params.id}`)
  }

  const { data: instruments } = await supabase
    .from("instrument_master")
    .select("id, instrument_name, serial_number, calibration_due")
    .eq("is_active", true)
    .in("instrument_type", ["pmi", "other"])
    .order("instrument_name")

  const defaultValues = pmiReportToFormValues(r)

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/pmi-reports/${params.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> {r.report_number ?? "PMI Report"}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit PMI Report</h1>
      <PmiReportForm
        mode="edit"
        jobCardId={r.job_card_id}
        reportId={r.id}
        defaultValues={defaultValues}
        instruments={(instruments as InstrumentMaster[] | null) ?? []}
      />
    </div>
  )
}
