import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatQty } from "@/lib/format"
import { ConsumptionConfirm } from "@/components/inventory/consumption-confirm"
import type { UserRole } from "@/types/database"

type IssueItem = {
  id: string
  issued_qty: number
  consumed_qty: number | null
  returned_qty: number
  uom: string
  item_master: { item_code: string; item_name: string }
  storage_locations: { code: string; name: string }
}

export default async function MaterialIssueDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole
  const canConfirm = ["admin", "operator", "engineer"].includes(userRole)

  const { data: record, error } = await supabase
    .from("material_issues")
    .select(`
      *, job_cards(jc_number),
      material_issue_items(*, item_master(item_code, item_name), storage_locations(code, name))
    `)
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const items = (record.material_issue_items ?? []) as IssueItem[]
  const isConfirmed = record.consumption_status === "confirmed"

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/inventory/material-issues" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Material Issues
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.issue_number}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 space-x-1">
            {record.job_cards?.jc_number && <span>For job card {record.job_cards.jc_number}</span>}
            {record.issued_to && <span>· Issued to {record.issued_to}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              record.status === "issued" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            )}
          >
            {record.status === "issued" ? "Issued" : "Cancelled"}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              isConfirmed ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            )}
          >
            {isConfirmed ? "Usage confirmed" : "Usage pending"}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Issued Items</h2>
        <div className="divide-y divide-border">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p>{it.item_master.item_code} — {it.item_master.item_name}</p>
                <p className="text-xs text-muted-foreground">From {it.storage_locations.code} — {it.storage_locations.name}</p>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">{formatQty(it.issued_qty)} {it.uom} issued</span>
                {isConfirmed && it.consumed_qty != null && (
                  <p className="text-xs text-muted-foreground">
                    Used {formatQty(it.consumed_qty)} · {it.returned_qty > 0
                      ? <span className="text-green-700">returned {formatQty(it.returned_qty)} {it.uom}</span>
                      : "fully used"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point 3 — confirm actual usage; unused returns to stock. */}
      {!isConfirmed && canConfirm && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-5">
          <h2 className="font-semibold mb-3">Confirm Usage</h2>
          <ConsumptionConfirm
            issueId={record.id}
            lines={items.map((it) => ({
              id: it.id, issued_qty: it.issued_qty, uom: it.uom, item_master: it.item_master,
            }))}
          />
        </div>
      )}

      {record.remarks && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-1">Remarks</h2>
          <p className="text-sm text-muted-foreground">{record.remarks}</p>
        </div>
      )}
    </div>
  )
}
