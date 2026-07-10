"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { jobCardColumns } from "@/components/job-cards/columns"
import type { JobCardWithRelations } from "@/types/database"

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
  { value: "dispatch", label: "Dispatch" },
  { value: "accounts_processing", label: "Accounts Processing" },
  { value: "closed", label: "Closed" },
  { value: "on_hold", label: "On Hold" },
]

export function JobCardsClient({
  jobCards,
  totalCount,
  activeCount,
  currentStatus,
  page,
  pageSize,
  totalPages,
}: {
  jobCards: JobCardWithRelations[]
  totalCount: number
  activeCount: number
  currentStatus: string | null
  page: number
  pageSize: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") {
        params.delete(k)
      } else {
        params.set(k, v)
      }
    }
    return `${pathname}?${params.toString()}`
  }

  function onStatusChange(value: string) {
    // Reset to page 1 when filter changes
    router.push(buildUrl({ status: value || null, page: null }))
  }

  function onPageChange(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }))
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Cards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} active
            {currentStatus
              ? ` · ${totalCount} with status "${currentStatus.replace(/_/g, " ")}"`
              : ` · ${totalCount} total`}
          </p>
        </div>
        <Link href="/job-cards/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4 mr-1" /> New Job Card
        </Link>
      </div>

      {/* Filters */}
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
          <button
            onClick={() => onStatusChange("")}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={jobCardColumns}
        data={jobCards}
        searchKey="jc_number"
        searchPlaceholder="Search JC number..."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{totalCount === 0 ? 0 : from}–{to}</span> of{" "}
            <span className="font-medium">{totalCount}</span> job cards
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={!canPrev}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40 hover:bg-secondary disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrev}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40 hover:bg-secondary disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number
              if (totalPages <= 5) {
                p = i + 1
              } else if (page <= 3) {
                p = i + 1
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i
              } else {
                p = page - 2 + i
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-secondary ${
                    p === page ? "bg-primary text-primary-foreground border-primary hover:bg-primary" : ""
                  }`}
                >
                  {p}
                </button>
              )
            })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40 hover:bg-secondary disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={!canNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40 hover:bg-secondary disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
