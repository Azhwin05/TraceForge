import { requireAuth } from "@/lib/auth"
import { InventoryDashboardClient, type ItemStock } from "@/components/inventory/inventory-dashboard-client"

type BalanceRow = {
  item_id: string | null
  storage_location_id: string | null
  balance_qty: number | null
  balance_value: number | null
  avg_unit_cost: number | null
  item_master: {
    item_code: string
    item_name: string
    category: string
    consumable_type: string | null
    uom: string
    min_stock_level: number
    is_active: boolean
  } | null
}

export default async function InventoryDashboardPage() {
  const { supabase } = await requireAuth()

  const { data: balances } = await supabase
    .from("stock_balances")
    .select("*, item_master(item_code, item_name, category, consumable_type, uom, min_stock_level, is_active)")

  // Roll every storage-location balance up to one row per item so the
  // dashboard shows total qty and total value held for each material.
  const byItem = new Map<string, ItemStock>()
  for (const b of (balances ?? []) as unknown as BalanceRow[]) {
    if (!b.item_id || !b.item_master) continue
    const qty = Number(b.balance_qty) || 0
    const value = Number(b.balance_value) || 0
    if (qty <= 0) continue

    const existing = byItem.get(b.item_id)
    if (existing) {
      existing.qty += qty
      existing.value += value
    } else {
      byItem.set(b.item_id, {
        item_id:         b.item_id,
        item_code:       b.item_master.item_code,
        item_name:       b.item_master.item_name,
        category:        b.item_master.category,
        consumable_type: b.item_master.consumable_type,
        uom:             b.item_master.uom,
        min_stock_level: Number(b.item_master.min_stock_level) || 0,
        is_active:       b.item_master.is_active,
        qty,
        value,
      })
    }
  }

  const items = Array.from(byItem.values())
    .map((it) => ({ ...it, avg_unit_cost: it.qty > 0 ? it.value / it.qty : 0 }))
    .sort((a, b) => b.value - a.value)

  const totalValue = items.reduce((s, it) => s + it.value, 0)
  const belowMin = items.filter((it) => it.min_stock_level > 0 && it.qty < it.min_stock_level).length
  const rawMaterialValue = items.filter((it) => it.category === "raw_material").reduce((s, it) => s + it.value, 0)
  const consumableValue = items.filter((it) => it.category === "consumable").reduce((s, it) => s + it.value, 0)

  return (
    <div className="p-6">
      <InventoryDashboardClient
        items={items}
        totals={{
          totalValue,
          itemCount: items.length,
          belowMin,
          rawMaterialValue,
          consumableValue,
        }}
      />
    </div>
  )
}
