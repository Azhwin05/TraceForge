import { requireAuth } from "@/lib/auth"
import { StockBalanceListClient } from "@/components/inventory/stock-balance-list-client"

export default async function StockBalancesPage() {
  const { supabase } = await requireAuth()

  const { data: balances } = await supabase
    .from("stock_balances")
    .select("*, item_master(item_code, item_name, category, uom, min_stock_level), storage_locations(code, name)")
    .order("item_id")

  return (
    <div className="p-6">
      <StockBalanceListClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balances={(balances ?? []) as any}
      />
    </div>
  )
}
