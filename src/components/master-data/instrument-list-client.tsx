"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, ChevronRight, AlertTriangle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { InstrumentMaster, UserRole } from "@/types/database"

const TYPE_LABELS: Record<string, string> = {
  pmi:         "PMI",
  dimensional: "Dimensional",
  visual:      "Visual",
  hardness:    "Hardness",
  nde:         "NDE",
  other:       "Other",
}

function calibrationStatus(calibration_due: string | null | undefined): "ok" | "warning" | "overdue" | "none" {
  if (!calibration_due) return "none"
  const due = new Date(calibration_due)
  const now = new Date()
  const daysUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0) return "overdue"
  if (daysUntil <= 30) return "warning"
  return "ok"
}

function CalibrationBadge({ calibration_due }: { calibration_due: string | null | undefined }) {
  const status = calibrationStatus(calibration_due)
  if (status === "none") return null
  if (status === "ok") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Cal: {new Date(calibration_due!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "overdue" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      {status === "overdue"
        ? `Overdue: ${new Date(calibration_due!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}`
        : `Due: ${new Date(calibration_due!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}`}
    </span>
  )
}

export function InstrumentListClient({
  records,
  userRole,
}: {
  records: InstrumentMaster[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active")

  const canCreate = ["admin", "qa"].includes(userRole)

  const filtered = records.filter((i) => {
    const matchActive =
      activeFilter === "all" ||
      (activeFilter === "active" && i.is_active) ||
      (activeFilter === "inactive" && !i.is_active)
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      i.instrument_name.toLowerCase().includes(q) ||
      (i.serial_number ?? "").toLowerCase().includes(q) ||
      (i.manufacturer ?? "").toLowerCase().includes(q)
    return matchActive && matchSearch
  })

  const tabs: { value: typeof activeFilter; label: string }[] = [
    { value: "active",   label: "Active"   },
    { value: "inactive", label: "Inactive" },
    { value: "all",      label: "All"      },
  ]

  const overdueCount = records.filter(
    (i) => i.is_active && calibrationStatus(i.calibration_due) !== "ok" && calibrationStatus(i.calibration_due) !== "none"
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instrument Master</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.filter((i) => i.is_active).length} active · {records.length} total
            {overdueCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueCount} calibration alert{overdueCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        {canCreate && (
          <Link href="/master-data/instruments/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Instrument
          </Link>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            className={cn(
              "px-3 py-2 text-sm transition-colors",
              activeFilter === value
                ? "border-b-2 border-brand-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {value === "all"     ? records.length
                : value === "active"   ? records.filter((i) => i.is_active).length
                : records.filter((i) => !i.is_active).length}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search instrument name, serial no…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "No instruments match your search." : "No instruments found."}
          </p>
          {canCreate && !search && (
            <Link href="/master-data/instruments/new" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Instrument
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((i) => (
            <Link
              key={i.id}
              href={`/master-data/instruments/${i.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i.instrument_name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {TYPE_LABELS[i.instrument_type] ?? i.instrument_type}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      i.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {i.is_active ? "Active" : "Inactive"}
                  </span>
                  <CalibrationBadge calibration_due={i.calibration_due} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {i.serial_number && <span>S/N: {i.serial_number}</span>}
                  {i.manufacturer && <span>{i.manufacturer}</span>}
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
