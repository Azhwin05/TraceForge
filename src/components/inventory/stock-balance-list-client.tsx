"use client"

import { useState } from "react"
import { Search, AlertTriangle, SlidersHorizontal, History } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatInr, formatQty } from "@/lib/format"
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog"
import type { UserRole } from "@/types/database"

type BalanceRow = {
  item_id: string
  storage_location_id: string
  balance_qty: number
  balance_value: number
  avg_unit_cost: number
  item_master: { item_code: string; item_name: string; category: string; uom: string; min_stock_level: number; is_active: boolean }
  storage_locations: { code: string; name: string }
}

type ItemOption = { id: string; item_code: string; item_name: string; uom: string }
type LocationOption = { id: string; code: string; name: string }

type AdjustmentRow = {
  id: string
  direction: string
  qty: number
  unit_rate: number
  reason: string
  created_at: string
  item_master: { item_code: string; item_name: string } | null
  storage_locations: { code: string } | null
  profiles: { full_name: string } | null
}

export function StockBalanceListClient({
  balances, items, locations, recentAdjustments, userRole,
}: {
  balances: BalanceRow[]
  items: ItemOption[]
  locations: LocationOption[]
  recentAdjustments: AdjustmentRow[]
  userRole: UserRole
}) {
  const [search, setSearch] = useState("")
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustPrefill, setAdjustPrefill] = useState<{ itemId?: string; locationId?: string }>({})
  const isAdmin = userRole === "admin"

  const nonZero = balances.filter((b) => b.balance_qty > 0)
  const filtered = nonZero.filter((b) => {
    const q = search.toLowerCase()
    return (
      !q ||
      b.item_master.item_code.toLowerCase().includes(q) ||
      b.item_master.item_name.toLowerCase().includes(q) ||
      b.storage_locations.code.toLowerCase().includes(q)
    )
  })

  const balanceLookup = balances.map((b) => ({
    item_id: b.item_id, storage_location_id: b.storage_location_id,
    balance_qty: b.balance_qty, avg_unit_cost: b.avg_unit_cost,
  }))

  function openAdjust(itemId?: string, locationId?: string) {
    setAdjustPrefill({ itemId, locationId })
    setAdjustOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Balances</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live balance derived from the stock ledger</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => openAdjust()}>
            <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Adjust Stock
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search item or location…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">{search ? "No stock matches your search." : "No stock on hand yet."}</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((b) => {
            const belowMin = b.item_master.min_stock_level > 0 && b.balance_qty < b.item_master.min_stock_level
            return (
              <div key={`${b.item_id}-${b.storage_location_id}`} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{b.item_master.item_code}</span>
                    <span className="text-muted-foreground">— {b.item_master.item_name}</span>
                    {belowMin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        <AlertTriangle className="h-3 w-3" /> Below minimum
                      </span>
                    )}
                    {!b.item_master.is_active && (
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Deactivated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{b.storage_locations.code} — {b.storage_locations.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={cn("text-sm font-medium", belowMin && "text-orange-700")}>
                      {formatQty(b.balance_qty)} {b.item_master.uom}
                    </span>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatInr(b.balance_value)}
                      <span className="ml-1 opacity-70">@ {formatInr(b.avg_unit_cost)}</span>
                    </p>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => openAdjust(b.item_id, b.storage_location_id)}>
                      Adjust
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isAdmin && recentAdjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Recent Adjustments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAdjustments.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0 text-sm">
                <div className="min-w-0">
                  <p>
                    <span className={a.direction === "in" ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                      {a.direction === "in" ? "+" : "−"}{formatQty(a.qty)}
                    </span>{" "}
                    {a.item_master?.item_code} — {a.item_master?.item_name}
                    {a.storage_locations?.code && ` (${a.storage_locations.code})`}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                </div>
                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  {a.profiles?.full_name && <p>{a.profiles.full_name}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <StockAdjustmentDialog
          items={items}
          locations={locations}
          balances={balanceLookup}
          initialItemId={adjustPrefill.itemId}
          initialLocationId={adjustPrefill.locationId}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
        />
      )}
    </div>
  )
}
