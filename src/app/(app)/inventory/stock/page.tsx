import { requireAuth } from "@/lib/auth"
import { StockBalanceListClient } from "@/components/inventory/stock-balance-list-client"
import type { UserRole } from "@/types/database"

export default async function StockBalancesPage() {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const [{ data: balances }, { data: items }, { data: locations }, { data: adjustments }] = await Promise.all([
    supabase
      .from("stock_balances")
      .select("*, item_master(item_code, item_name, category, consumable_type, uom, min_stock_level, is_active), storage_locations(code, name)")
      .order("item_id"),
    supabase.from("item_master").select("id, item_code, item_name, uom").eq("is_active", true).eq("approval_status", "approved").order("item_code"),
    supabase.from("storage_locations").select("id, code, name").eq("is_active", true).order("code"),
    supabase
      .from("stock_adjustments")
      .select("*, item_master(item_code, item_name), storage_locations(code), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(15),
  ])

  return (
    <div className="p-6">
      <StockBalanceListClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balances={(balances ?? []) as any}
        items={items ?? []}
        locations={locations ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recentAdjustments={(adjustments ?? []) as any}
        userRole={userRole}
      />
    </div>
  )
}
