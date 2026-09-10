import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, AlertTriangle } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { must } from "@/lib/db"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatInr, formatQty } from "@/lib/format"

export const metadata = { title: "Storage Location — ValveTrack" }

type BalanceRow = {
  item_id: string
  balance_qty: number
  balance_value: number
  avg_unit_cost: number
  item_master: { item_code: string; item_name: string; uom: string; min_stock_level: number; consumable_type: string | null } | null
}

/**
 * "What all is in this box, completely" — client request. Stock Balances is
 * item-centric (each item shows which locations hold it); this is the
 * inverse view, one location showing everything currently sitting in it.
 */
export default async function StorageLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireAuth()

  const locationRes = await supabase
    .from("storage_locations")
    .select("id, code, name, description, is_active")
    .eq("id", id)
    .maybeSingle()

  const location = must(locationRes, "this storage location")
  if (!location) notFound()

  const balancesRes = await supabase
    .from("stock_balances")
    .select("item_id, balance_qty, balance_value, avg_unit_cost, item_master(item_code, item_name, uom, min_stock_level, consumable_type)")
    .eq("storage_location_id", id)
    .order("item_id")

  const balances = (must(balancesRes, "stock at this location") as unknown as BalanceRow[])
    .filter((b) => b.balance_qty > 0)

  const totalValue = balances.reduce((s, b) => s + b.balance_value, 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/inventory/locations" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Storage Locations
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{location.code} — {location.name}</h1>
          {location.description && <p className="mt-0.5 text-sm text-muted-foreground">{location.description}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Value Here</p>
          <p className="text-xl font-semibold tabular-nums">{formatInr(totalValue)}</p>
        </div>
      </div>

      {balances.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Nothing is currently held at this location.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty on Hand</th>
                <th className="px-4 py-2.5 text-right font-medium">Avg Unit Cost</th>
                <th className="px-4 py-2.5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {balances.map((b) => {
                const im = b.item_master
                const belowMin = !!im && im.min_stock_level > 0 && b.balance_qty < im.min_stock_level
                return (
                  <tr key={b.item_id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <span className="font-medium">{im?.item_code ?? "—"}</span>
                      <span className="ml-1.5 text-muted-foreground">{im?.item_name}</span>
                      {im?.consumable_type && (
                        <span className="ml-1.5 rounded-full bg-info-surface px-2 py-0.5 text-[10px] font-medium text-info">
                          {im.consumable_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn(belowMin && "font-medium text-warning")}>
                        {formatQty(b.balance_qty)} {im?.uom}
                      </span>
                      {belowMin && (
                        <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-warning" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatInr(b.avg_unit_cost)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatInr(b.balance_value)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/40 font-semibold">
                <td className="px-4 py-3" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatInr(totalValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
