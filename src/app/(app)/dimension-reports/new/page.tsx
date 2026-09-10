import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getSessionWithProfile } from "@/lib/auth"
import { DimensionReportForm } from "@/components/dimension/dimension-report-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole, JobCard, InstrumentMaster } from "@/types/database"

export const metadata = { title: "New Dimension Report — ValveTrack" }

export default async function NewDimensionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ job_card_id?: string }>
}) {
  const { job_card_id } = await searchParams
  const session = await getSessionWithProfile()
  const userRole = (session?.profile?.role ?? "operator") as UserRole

  if (!["admin", "qa"].includes(userRole)) redirect("/dimension-reports")

  const supabase = await createClient()

  if (!job_card_id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dimension-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
            <ChevronLeft className="h-4 w-4" /> Dimension Reports
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          No Job Card selected. Please open a Job Card and click &quot;New Dimension Report&quot;.
        </p>
      </div>
    )
  }

  const [{ data: jobCard }, { data: instruments }] = await Promise.all([
    supabase.from("job_cards").select("*").eq("id", job_card_id).single(),
    supabase.from("instrument_master").select("*").eq("is_active", true).order("instrument_name"),
  ])

  if (!jobCard) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dimension-reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Dimension Reports
        </Link>
        <span className="text-muted-foreground text-sm">/ New Report</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold">New Dimensional Inspection Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Job Card: <span className="font-medium text-foreground">{(jobCard as JobCard).jc_number}</span>
        </p>
      </div>
      <DimensionReportForm
        jobCardId={job_card_id}
        jobCard={jobCard as JobCard}
        report={null}
        instruments={(instruments ?? []) as InstrumentMaster[]}
      />
    </div>
  )
}
