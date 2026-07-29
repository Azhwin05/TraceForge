"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, AlertTriangle, Wallet, Boxes, Layers } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatInr, formatQty } from "@/lib/format"

export type ItemStock = {
  item_id: string
  item_code: string
  item_name: string
  category: string
  consumable_type: string | null
  uom: string
  min_stock_level: number
  is_active: boolean
  qty: number
  value: number
  avg_unit_cost?: number
}

type Totals = {
  totalValue: number
  itemCount: number
  belowMin: number
  rawMaterialValue: number
  consumableValue: number
}

const CATEGORY_LABELS: Record<string, string> = {
  raw_material:  "Raw Material",
  consumable:    "Consumable",
  component:     "Component",
  finished_part: "Finished Part",
  other:         "Other",
}

const CONSUMABLE_TYPE_LABELS: Record<string, string> = {
  powder: "Powder", rod: "Rod", wire: "Wire", other: "Other",
}

const FILTERS = [
  { key: "all",          label: "All" },
  { key: "raw_material", label: "Raw Material" },
  { key: "consumable",   label: "Consumable" },
] as const

function StatCard({
  icon: Icon, label, value, sub, tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  tone?: "default" | "warn"
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("h-4 w-4", tone === "warn" && "text-orange-500")} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", tone === "warn" && value !== "0" && "text-orange-600")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function InventoryDashboardClient({ items, totals }: { items: ItemStock[]; totals: Totals }) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((it) => {
      if (filter !== "all" && it.category !== filter) return false
      if (!q) return true
      return (
        it.item_code.toLowerCase().includes(q) ||
        it.item_name.toLowerCase().includes(q)
      )
    })
  }, [items, search, filter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live stock quantity and value, derived from the stock ledger</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Total Stock Value" value={formatInr(totals.totalValue)} sub="Value of everything on hand" />
        <StatCard icon={Boxes} label="Items in Stock" value={String(totals.itemCount)} sub="Distinct items with balance" />
        <StatCard icon={Layers} label="Raw vs Consumable" value={formatInr(totals.rawMaterialValue)} sub={`Consumables ${formatInr(totals.consumableValue)}`} />
        <StatCard icon={AlertTriangle} label="Below Minimum" value={String(totals.belowMin)} sub="Items under min stock level" tone="warn" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-brand-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search item…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Valued stock table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search || filter !== "all" ? "No stock matches this view." : "No stock on hand yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty on Hand</th>
                <th className="px-4 py-2.5 text-right font-medium">Avg Unit Cost</th>
                <th className="px-4 py-2.5 text-right font-medium">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((it) => {
                const belowMin = it.min_stock_level > 0 && it.qty < it.min_stock_level
                return (
                  <tr key={it.item_id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link href={`/inventory/items/${it.item_id}`} className="font-medium hover:underline">
                        {it.item_code}
                      </Link>
                      {!it.is_active && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Deactivated
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">{it.item_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {CATEGORY_LABELS[it.category] ?? it.category}
                        {it.consumable_type && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                            {CONSUMABLE_TYPE_LABELS[it.consumable_type] ?? it.consumable_type}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn(belowMin && "text-orange-600 font-medium")}>
                        {formatQty(it.qty)} {it.uom}
                      </span>
                      {belowMin && (
                        <span title="Below minimum" className="ml-1 inline-flex align-middle">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatInr(it.avg_unit_cost)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatInr(it.value)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/40 font-semibold">
                <td className="px-4 py-3" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatInr(filtered.reduce((s, it) => s + it.value, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
