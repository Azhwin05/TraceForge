"use client"

import { useState } from "react"
import { Search, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatInr, formatQty } from "@/lib/format"

type BalanceRow = {
  item_id: string
  storage_location_id: string
  balance_qty: number
  balance_value: number
  avg_unit_cost: number
  item_master: { item_code: string; item_name: string; category: string; uom: string; min_stock_level: number }
  storage_locations: { code: string; name: string }
}

export function StockBalanceListClient({ balances }: { balances: BalanceRow[] }) {
  const [search, setSearch] = useState("")

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Balances</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live balance derived from the stock ledger</p>
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
                  </div>
                  <p className="text-xs text-muted-foreground">{b.storage_locations.code} — {b.storage_locations.name}</p>
                </div>
                <div className="text-right">
                  <span className={cn("text-sm font-medium", belowMin && "text-orange-700")}>
                    {formatQty(b.balance_qty)} {b.item_master.uom}
                  </span>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatInr(b.balance_value)}
                    <span className="ml-1 opacity-70">@ {formatInr(b.avg_unit_cost)}</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
