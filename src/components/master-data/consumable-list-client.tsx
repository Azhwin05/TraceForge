"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, ChevronRight, AlertTriangle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ConsumableMaster, UserRole } from "@/types/database"

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
  electrode: "Electrode",
  wire:      "Wire",
  flux:      "Flux",
  rod:       "Rod",
  other:     "Other",
}

export function ConsumableListClient({
  records,
  userRole,
}: {
  records: ConsumableMaster[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active")

  const canCreate = ["admin", "engineer"].includes(userRole)

  function isExpiredOrExpiringSoon(expiry_date: string | null | undefined) {
    if (!expiry_date) return false
    const due = new Date(expiry_date)
    const daysUntil = Math.floor((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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
      c.brand.toLowerCase().includes(q) ||
      c.product_name.toLowerCase().includes(q) ||
      (c.aws_class ?? "").toLowerCase().includes(q) ||
      (c.size ?? "").toLowerCase().includes(q)
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
          <h1 className="text-2xl font-bold tracking-tight">Consumable Master</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.filter((c) => c.is_active).length} active ·{" "}
            {records.length} total
          </p>
        </div>
        {canCreate && (
          <Link href="/master-data/consumables/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Consumable
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
          placeholder="Search brand, product, AWS class…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "No consumables match your search." : "No consumables found."}
          </p>
          {canCreate && !search && (
            <Link href="/master-data/consumables/new" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Consumable
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/master-data/consumables/${c.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.brand}</span>
                  <span className="text-muted-foreground">—</span>
                  <span>{c.product_name}</span>
                  <ActiveBadge isActive={c.is_active} />
                  {isExpiredOrExpiringSoon(c.expiry_date) && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      new Date(c.expiry_date!) < new Date()
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    )}>
                      <AlertTriangle className="h-3 w-3" />
                      {new Date(c.expiry_date!) < new Date() ? "Expired" : "Expiring soon"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{TYPE_LABELS[c.type] ?? c.type}</span>
                  {c.aws_class && <span>{c.aws_class}</span>}
                  {c.size && <span>{c.size}</span>}
                  {c.batch_no && <span>Batch: {c.batch_no}</span>}
                  {c.manufacturer && <span>{c.manufacturer}</span>}
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
