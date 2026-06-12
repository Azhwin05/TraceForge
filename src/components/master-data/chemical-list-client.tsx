"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, ChevronRight, AlertTriangle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ChemicalMaster, UserRole } from "@/types/database"

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}

const TYPE_LABELS: Record<string, string> = {
  penetrant:  "Penetrant",
  developer:  "Developer",
  cleaner:    "Cleaner",
  remover:    "Remover",
  other:      "Other",
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  penetrant: "bg-red-100 text-red-700",
  developer: "bg-blue-100 text-blue-700",
  cleaner:   "bg-yellow-100 text-yellow-700",
  remover:   "bg-orange-100 text-orange-700",
  other:     "bg-slate-100 text-slate-600",
}

export function ChemicalListClient({
  records,
  userRole,
}: {
  records: ChemicalMaster[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active")

  const canCreate = ["admin", "qa"].includes(userRole)

  function isExpiredOrExpiringSoon(expiry_date: string | null | undefined) {
    if (!expiry_date) return false
    const daysUntil = Math.floor((new Date(expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 30
  }

  const filtered = records.filter((c) => {
    const matchActive =
      activeFilter === "all" ||
      (activeFilter === "active" && c.is_active) ||
      (activeFilter === "inactive" && !c.is_active)
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      c.chemical_name.toLowerCase().includes(q) ||
      (c.manufacturer ?? "").toLowerCase().includes(q)
    return matchActive && matchSearch
  })

  const tabs: { value: typeof activeFilter; label: string }[] = [
    { value: "active",   label: "Active"   },
    { value: "inactive", label: "Inactive" },
    { value: "all",      label: "All"      },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chemical Master</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.filter((c) => c.is_active).length} active ·{" "}
            {records.length} total
          </p>
        </div>
        {canCreate && (
          <Link href="/master-data/chemicals/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Chemical
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
                : value === "active"   ? records.filter((c) => c.is_active).length
                : records.filter((c) => !c.is_active).length}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chemical name, manufacturer…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "No chemicals match your search." : "No chemicals found."}
          </p>
          {canCreate && !search && (
            <Link href="/master-data/chemicals/new" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Chemical
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/master-data/chemicals/${c.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.chemical_name}</span>
                  <ActiveBadge isActive={c.is_active} />
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      TYPE_BADGE_COLORS[c.type] ?? "bg-slate-100 text-slate-600"
                    )}
                  >
                    {TYPE_LABELS[c.type] ?? c.type}
                  </span>
                </div>
                {isExpiredOrExpiringSoon(c.expiry_date) && (
                  <span className={cn(
                    "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    new Date(c.expiry_date!) < new Date()
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  )}>
                    <AlertTriangle className="h-3 w-3" />
                    {new Date(c.expiry_date!) < new Date() ? "Expired" : "Expiring soon"}
                  </span>
                )}
                {(c.manufacturer || c.batch_no) && (
                  <p className="text-xs text-muted-foreground">
                    {c.manufacturer}{c.manufacturer && c.batch_no ? " · " : ""}
                    {c.batch_no ? `Batch: ${c.batch_no}` : ""}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
