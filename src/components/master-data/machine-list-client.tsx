"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Machine, UserRole } from "@/types/database"

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

const CATEGORY_LABELS: Record<string, string> = {
  welding:   "Welding",
  machining: "Machining",
}

export function MachineListClient({
  records,
  userRole,
}: {
  records: Machine[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "welding" | "machining">("all")

  const canCreate = ["admin", "engineer"].includes(userRole)

  const filtered = records.filter((m) => {
    const matchActive =
      activeFilter === "all" ||
      (activeFilter === "active" && m.is_active) ||
      (activeFilter === "inactive" && !m.is_active)
    const matchCategory = categoryFilter === "all" || m.category === categoryFilter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      m.machine_code.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.location ?? "").toLowerCase().includes(q)
    return matchActive && matchCategory && matchSearch
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
          <h1 className="text-2xl font-bold tracking-tight">Machines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.filter((m) => m.is_active).length} active · {records.length} total
          </p>
        </div>
        {canCreate && (
          <Link href="/master-data/machines/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Machine
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
              {value === "all"       ? records.length
                : value === "active" ? records.filter((m) => m.is_active).length
                : records.filter((m) => !m.is_active).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code, name, location…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
          className="flex h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="all">All categories</option>
          <option value="welding">Welding</option>
          <option value="machining">Machining</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "No machines match your search." : "No machines found."}
          </p>
          {canCreate && !search && (
            <Link href="/master-data/machines/new" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Machine
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((m) => (
            <Link
              key={m.id}
              href={`/master-data/machines/${m.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{m.machine_code}</span>
                  <span className="text-muted-foreground">—</span>
                  <span>{m.name}</span>
                  <ActiveBadge isActive={m.is_active} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{CATEGORY_LABELS[m.category] ?? m.category}</span>
                  {m.location && <span>{m.location}</span>}
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
