import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ItemMasterToggleActive } from "@/components/inventory/item-master-toggle-active"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

import { formatInr, formatQty } from "@/lib/format"

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

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
    </div>
  )
}

export default async function ItemMasterDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const { data: record, error } = await supabase
    .from("item_master")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const { data: balances } = await supabase
    .from("stock_balances")
    .select("storage_location_id, balance_qty, balance_value, avg_unit_cost, storage_locations(code, name)")
    .eq("item_id", record.id)

  const canEdit = ["admin", "engineer"].includes(userRole)
  const canDeactivate = userRole === "admin"
  const totalBalance = (balances ?? []).reduce((sum, b) => sum + (b.balance_qty ?? 0), 0)
  const totalValue = (balances ?? []).reduce((sum, b) => sum + (b.balance_value ?? 0), 0)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/inventory/items" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Items
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.item_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{record.item_code}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              record.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            )}
          >
            {record.is_active ? "Active" : "Inactive"}
          </span>
          {canEdit && (
            <Link href={`/inventory/items/${record.id}/edit`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Details</h2>
        <dl className="divide-y divide-border">
          <Row label="Item Code"    value={record.item_code} />
          <Row label="Item Name"    value={record.item_name} />
          <Row label="Category"     value={CATEGORY_LABELS[record.category] ?? record.category} />
          {record.consumable_type && (
            <Row label="Consumable Type" value={CONSUMABLE_TYPE_LABELS[record.consumable_type] ?? record.consumable_type} />
          )}
          <Row label="UOM"          value={record.uom} />
          <Row label="HSN Code"     value={record.hsn_code} />
          <Row label="Min Stock"    value={`${record.min_stock_level} ${record.uom}`} />
          <Row label="Description" value={record.description} />
        </dl>
      </div>

      <div className="rounded-lg border border-border p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">Current Stock ({formatQty(totalBalance)} {record.uom})</h2>
          <span className="text-sm font-semibold tabular-nums">{formatInr(totalValue)}</span>
        </div>
        {balances && balances.length > 0 ? (
          <dl className="divide-y divide-border">
            {balances.map((b, i) => (
              <Row
                key={i}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(b as any).storage_locations?.name ?? "Unknown location"}
                value={`${formatQty(b.balance_qty ?? 0)} ${record.uom} · ${formatInr(b.balance_value ?? 0)} (@ ${formatInr(b.avg_unit_cost ?? 0)})`}
              />
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No stock recorded yet.</p>
        )}
      </div>

      {canDeactivate && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-1">Status</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {record.is_active
              ? "This item is active and can be received / issued."
              : "This item is inactive and hidden from new transaction forms."}
          </p>
          <ItemMasterToggleActive id={record.id} isActive={record.is_active} />
        </div>
      )}
    </div>
  )
}
