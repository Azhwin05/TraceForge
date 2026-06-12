"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { WpsMaster, WpsMasterStatus, UserRole } from "@/types/database"

const STATUS_TABS: { value: WpsMasterStatus | "all"; label: string }[] = [
  { value: "all",       label: "All"       },
  { value: "draft",     label: "Draft"     },
  { value: "approved",  label: "Approved"  },
  { value: "superseded", label: "Superseded" },
]

const STATUS_BADGE: Record<WpsMasterStatus, { label: string; className: string }> = {
  draft:      { label: "Draft",      className: "bg-amber-100 text-amber-700" },
  approved:   { label: "Approved",   className: "bg-green-100 text-green-700" },
  superseded: { label: "Superseded", className: "bg-slate-100 text-slate-600" },
}

function StatusBadge({ status }: { status: WpsMasterStatus }) {
  const { label, className } = STATUS_BADGE[status]
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  )
}

export function WpsListClient({
  wpsRecords,
  userRole,
}: {
  wpsRecords: WpsMaster[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<WpsMasterStatus | "all">("all")

  const canCreate = ["admin", "qa"].includes(userRole)

  const filtered = wpsRecords.filter((w) => {
    const matchStatus = activeTab === "all" || w.status === activeTab
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      w.wps_no.toLowerCase().includes(q) ||
      (w.pqr_no ?? "").toLowerCase().includes(q) ||
      (w.welding_process ?? "").toLowerCase().includes(q) ||
      (w.filler_aws_class ?? "").toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WPS Master</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {wpsRecords.length} record{wpsRecords.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {canCreate && (
          <Link href="/master-data/wps/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New WPS
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "px-3 py-2 text-sm transition-colors",
              activeTab === value
                ? "border-b-2 border-brand-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {value === "all"
                ? wpsRecords.length
                : wpsRecords.filter((w) => w.status === value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search WPS No., process, filler…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "No WPS records match your search." : "No WPS records yet."}
          </p>
          {canCreate && !search && (
            <Link href="/master-data/wps/new" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              <Plus className="mr-1.5 h-4 w-4" /> Create First WPS
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((wps) => (
            <Link
              key={wps.id}
              href={`/master-data/wps/${wps.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium text-brand-primary">{wps.wps_no}</span>
                  <StatusBadge status={wps.status} />
                  {wps.pqr_no && (
                    <span className="text-xs text-muted-foreground">PQR: {wps.pqr_no}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {wps.welding_process && <span>{wps.welding_process}</span>}
                  {wps.filler_aws_class && <span>Filler: {wps.filler_aws_class}</span>}
                  {wps.revision && <span>{wps.revision}</span>}
                  {wps.effective_date && (
                    <span>
                      Effective:{" "}
                      {new Date(wps.effective_date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
