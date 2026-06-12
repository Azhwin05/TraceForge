"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { jobCardColumns } from "@/components/job-cards/columns"
import type { JobCardWithRelations, JobCardStatus } from "@/types/database"

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "created", label: "Created" },
  { value: "wps_pending", label: "WPS Pending" },
  { value: "wps_uploaded", label: "WPS Uploaded" },
  { value: "wps_approved", label: "WPS Approved" },
  { value: "process_assigned", label: "Process Assigned" },
  { value: "in_process", label: "In Process" },
  { value: "process_complete", label: "Process Complete" },
  { value: "reports_pending", label: "Reports Pending" },
  { value: "reports_complete", label: "Reports Complete" },
  { value: "dispatch_ready", label: "Dispatch Ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "accounts_processing", label: "Accounts Processing" },
  { value: "closed", label: "Closed" },
  { value: "on_hold", label: "On Hold" },
]

export function JobCardsClient({
  jobCards,
  totalCount,
  activeCount,
  currentStatus,
}: {
  jobCards: JobCardWithRelations[]
  totalCount: number
  activeCount: number
  currentStatus: JobCardStatus | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set("status", value)
    } else {
      params.delete("status")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Cards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} active
            {currentStatus
              ? ` · showing ${totalCount} with status "${currentStatus.replace(/_/g, " ")}"`
              : ` · showing latest ${totalCount}`}
          </p>
        </div>
        <Link href="/job-cards/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4 mr-1" /> New Job Card
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={currentStatus ?? ""}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {currentStatus && (
          <span className="text-xs text-muted-foreground">
            Filtered server-side · <button onClick={() => onStatusChange("")} className="underline hover:text-foreground">Clear</button>
          </span>
        )}
      </div>

      <DataTable
        columns={jobCardColumns}
        data={jobCards}
        searchKey="jc_number"
        searchPlaceholder="Search JC number..."
      />
    </div>
  )
}
