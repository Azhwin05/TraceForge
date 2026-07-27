"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, ChevronRight, AlertTriangle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ApprovalActions, ApprovalBadge } from "@/components/inventory/approval-actions"
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import { deleteItemMaster, toggleItemMasterActive } from "@/app/(app)/inventory/items/actions"
import type { ItemMaster, UserRole } from "@/types/database"

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
  raw_material:   "Raw Material",
  consumable:     "Consumable",
  component:      "Component",
  finished_part:  "Finished Part",
  other:          "Other",
}

const CONSUMABLE_TYPE_LABELS: Record<string, string> = {
  powder: "Powder", rod: "Rod", wire: "Wire", other: "Other",
}

export function ItemMasterListClient({
  records,
  userRole,
}: {
  records: ItemMaster[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active")

  const canCreate = ["admin", "engineer"].includes(userRole)
  const isAdmin = userRole === "admin"
  const pendingItems = records.filter((it) => it.approval_status === "pending")

  const filtered = records.filter((it) => {
    const matchActive =
      activeFilter === "all" ||
      (activeFilter === "active" && it.is_active) ||
      (activeFilter === "inactive" && !it.is_active)
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      it.item_code.toLowerCase().includes(q) ||
      it.item_name.toLowerCase().includes(q)
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
          <h1 className="text-2xl font-bold tracking-tight">Item Master</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.filter((it) => it.is_active).length} active ·{" "}
            {records.length} total
          </p>
        </div>
        {canCreate && (
          <Link href="/inventory/items/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Item
          </Link>
        )}
      </div>

      {isAdmin && pendingItems.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">
            {pendingItems.length} item{pendingItems.length > 1 ? "s" : ""} awaiting your approval
          </h2>
          <div className="divide-y divide-amber-200">
            {pendingItems.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{it.item_code} — {it.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[it.category] ?? it.category}
                    {it.consumable_type ? ` · ${CONSUMABLE_TYPE_LABELS[it.consumable_type] ?? it.consumable_type}` : ""}
                    {" · "}UOM {it.uom}
                  </p>
                </div>
                <ApprovalActions kind="item" id={it.id} />
              </div>
            ))}
          </div>
        </div>
      )}

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
                : value === "active"   ? records.filter((it) => it.is_active).length
                : records.filter((it) => !it.is_active).length}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search item code or name…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "No items match your search." : "No items found."}
          </p>
          {canCreate && !search && (
            <Link href="/inventory/items/new" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Item
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors">
              <Link href={`/inventory/items/${it.id}`} className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{it.item_code}</span>
                  <span className="text-muted-foreground">—</span>
                  <span>{it.item_name}</span>
                  <ActiveBadge isActive={it.is_active} />
                  <ApprovalBadge status={it.approval_status} />
                  {it.min_stock_level > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                      <AlertTriangle className="h-3 w-3" />
                      Min {it.min_stock_level} {it.uom}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{CATEGORY_LABELS[it.category] ?? it.category}</span>
                  {it.consumable_type && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
                      {CONSUMABLE_TYPE_LABELS[it.consumable_type] ?? it.consumable_type}
                    </span>
                  )}
                  <span>UOM: {it.uom}</span>
                  {it.hsn_code && <span>HSN: {it.hsn_code}</span>}
                </div>
              </Link>
              {isAdmin && (
                <InventoryRowActions
                  label={`${it.item_code} — ${it.item_name}`}
                  isActive={it.is_active}
                  canDeactivate
                  canDelete
                  onDelete={() => deleteItemMaster(it.id)}
                  onToggleActive={(next) => toggleItemMasterActive(it.id, next)}
                />
              )}
              <Link href={`/inventory/items/${it.id}`}>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
