"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Loader2, X } from "lucide-react"
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
  currentQuery,
  page,
  pageSize,
  totalPages,
}: {
  jobCards: JobCardWithRelations[]
  totalCount: number
  activeCount: number
  currentStatus: string | null
  currentQuery: string
  page: number
  pageSize: number
  totalPages: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
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

  // Debounced so typing does not fire a request per keystroke. Resets to page 1
  // because the result set changes entirely.
  const [term, setTerm] = useState(currentQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setTerm(currentQuery) }, [currentQuery])
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function onSearchChange(value: string) {
    setTerm(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Under 2 characters is treated as "no search" by the filter builder, so
      // clear the param rather than sending a term that will be ignored.
      const next = value.trim().length >= 2 ? value.trim() : null
      startTransition(() => router.push(buildUrl({ q: next, page: null })))
    }, 350)
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
            {currentQuery
              ? ` · ${totalCount} matching "${currentQuery}"`
              : currentStatus
                ? ` · ${totalCount} with status "${currentStatus.replace(/_/g, " ")}"`
                : ` · ${totalCount} total`}
          </p>
        </div>
        <Link href="/job-cards/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4 mr-1" /> New Job Card
        </Link>
      </div>

      {/* Universal search (client request #4).
          Server-backed and applied to the query itself, so it searches EVERY
          job card across every page — JC/NBDN/PO/drawing/heat/part number,
          description, client name and tags. The table's old client-side filter
          only saw the current page's rows and only matched jc_number. */}
      <div className="relative">
        {isPending ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          value={term}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search job cards — JC number, client, PO, NBDN, drawing, heat, part, description, tag…"
          aria-label="Search job cards"
          className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-9 text-sm outline-none focus-visible:border-ring"
        />
        {term && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
      {currentQuery && totalCount === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No job cards match <span className="font-medium text-foreground">&ldquo;{currentQuery}&rdquo;</span>.
          </p>
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="mt-2 text-xs text-brand-primary underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <DataTable columns={jobCardColumns} data={jobCards} />
      )}

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
