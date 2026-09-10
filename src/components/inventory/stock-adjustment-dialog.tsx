"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatInr, formatQty } from "@/lib/format"
import { createStockAdjustment } from "@/app/(app)/inventory/stock/actions"

type ItemOption = { id: string; item_code: string; item_name: string; uom: string }
type LocationOption = { id: string; code: string; name: string }
type BalanceLookup = { item_id: string; storage_location_id: string; balance_qty: number; avg_unit_cost: number }

export function StockAdjustmentDialog({
  items, locations, balances,
  initialItemId, initialLocationId, initialDirection, initialQty,
  open, onOpenChange,
}: {
  items: ItemOption[]
  locations: LocationOption[]
  balances: BalanceLookup[]
  initialItemId?: string
  initialLocationId?: string
  /** Set by the "Clear Stock" shortcut to pre-select a full decrease.
   *  The reason field is still required — this pre-fills the form, it
   *  never submits on the user's behalf. */
  initialDirection?: "in" | "out"
  initialQty?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const isClearShortcut = initialDirection === "out" && initialQty != null
  const [itemId, setItemId] = useState(initialItemId ?? "")
  const [locationId, setLocationId] = useState(initialLocationId ?? "")
  const [direction, setDirection] = useState<"in" | "out">(initialDirection ?? "in")
  const [qty, setQty] = useState(initialQty != null ? String(initialQty) : "")
  const [rate, setRate] = useState("")
  // Left blank even for the Clear shortcut on purpose — a real, specific
  // reason is what makes the audit trail worth having, not a boilerplate note.
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = useMemo(
    () => balances.find((b) => b.item_id === itemId && b.storage_location_id === locationId),
    [balances, itemId, locationId],
  )
  const selectedItem = items.find((i) => i.id === itemId)

  function handleClose(next: boolean) {
    if (!next) {
      setItemId(initialItemId ?? ""); setLocationId(initialLocationId ?? "")
      setDirection(initialDirection ?? "in")
      setQty(initialQty != null ? String(initialQty) : "")
      setRate(""); setReason(""); setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    setError(null)
    if (!itemId || !locationId) { setError("Select an item and a storage location."); return }
    if (!qty || Number(qty) <= 0) { setError("Enter a quantity greater than 0."); return }
    if (!reason.trim()) { setError("A reason is required."); return }
    if (direction === "out" && current && Number(qty) > current.balance_qty) {
      setError(`Cannot reduce by more than the current balance (${formatQty(current.balance_qty)} ${selectedItem?.uom ?? ""}).`)
      return
    }

    setBusy(true)
    const res = await createStockAdjustment({
      item_id: itemId,
      storage_location_id: locationId,
      direction,
      qty: Number(qty),
      unit_rate: direction === "in" ? (rate ? Number(rate) : undefined) : undefined,
      reason: reason.trim(),
    })
    setBusy(false)
    if (res.error) { setError(res.error); return }
    toast.success(`Stock ${direction === "in" ? "increased" : "decreased"} for ${selectedItem?.item_code ?? "item"}`)
    handleClose(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isClearShortcut ? "Clear Stock" : "Adjust Stock"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isClearShortcut && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              This will reduce the balance to zero for this item at this location. Enter a reason and confirm below —
              nothing is submitted until you do.
            </p>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Item</Label>
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="mt-1" disabled={!!initialItemId}>
                <option value="">Select item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Storage Location</Label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="mt-1" disabled={!!initialLocationId}>
                <option value="">Select location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {itemId && locationId && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Current: {formatQty(current?.balance_qty ?? 0)} {selectedItem?.uom} · avg cost {formatInr(current?.avg_unit_cost ?? 0)}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection("in")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                direction === "in" ? "border-success-border bg-success-surface text-success" : "border-input text-muted-foreground"
              }`}
            >
              Increase (found stock)
            </button>
            <button
              type="button"
              onClick={() => setDirection("out")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                direction === "out" ? "border-danger-border bg-danger-surface text-danger" : "border-input text-muted-foreground"
              }`}
            >
              Decrease (damaged / lost)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quantity {selectedItem && `(${selectedItem.uom})`}</Label>
              <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" />
            </div>
            {direction === "in" && (
              <div>
                <Label className="text-xs">Rate (₹) — optional</Label>
                <Input
                  type="number" step="0.01" value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder={formatInr(current?.avg_unit_cost ?? 0)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          {direction === "out" && (
            <p className="text-xs text-muted-foreground">
              A decrease is always valued at the item&rsquo;s current average cost, so the running average stays consistent.
            </p>
          )}

          <div>
            <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" rows={2} placeholder="e.g. physical count found 5kg extra in Bay 2" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy} variant={isClearShortcut ? "destructive" : "default"}>
            {busy ? "Saving…" : isClearShortcut ? "Clear Stock" : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
