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
import { formatQty } from "@/lib/format"
import { createStockTransfer } from "@/app/(app)/inventory/stock/transfer-actions"

type ItemOption = { id: string; item_code: string; item_name: string; uom: string }
type LocationOption = { id: string; code: string; name: string }
type BalanceLookup = { item_id: string; storage_location_id: string; balance_qty: number }

export function StockTransferDialog({
  items, locations, balances,
  initialItemId, initialFromLocationId,
  open, onOpenChange,
}: {
  items: ItemOption[]
  locations: LocationOption[]
  balances: BalanceLookup[]
  initialItemId?: string
  initialFromLocationId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [itemId, setItemId] = useState(initialItemId ?? "")
  const [fromLocationId, setFromLocationId] = useState(initialFromLocationId ?? "")
  const [toLocationId, setToLocationId] = useState("")
  const [qty, setQty] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = useMemo(
    () => balances.find((b) => b.item_id === itemId && b.storage_location_id === fromLocationId),
    [balances, itemId, fromLocationId],
  )
  const selectedItem = items.find((i) => i.id === itemId)

  function handleClose(next: boolean) {
    if (!next) {
      setItemId(initialItemId ?? ""); setFromLocationId(initialFromLocationId ?? "")
      setToLocationId(""); setQty(""); setReason(""); setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    setError(null)
    if (!itemId || !fromLocationId || !toLocationId) { setError("Select an item, source and destination location."); return }
    if (fromLocationId === toLocationId) { setError("Source and destination must be different locations."); return }
    if (!qty || Number(qty) <= 0) { setError("Enter a quantity greater than 0."); return }
    if (current && Number(qty) > current.balance_qty) {
      setError(`Cannot transfer more than what's at the source (${formatQty(current.balance_qty)} ${selectedItem?.uom ?? ""}).`)
      return
    }
    if (!reason.trim()) { setError("A reason is required."); return }

    setBusy(true)
    const res = await createStockTransfer({
      item_id: itemId,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      qty: Number(qty),
      reason: reason.trim(),
    })
    setBusy(false)
    if (res.error) { setError(res.error); return }
    toast.success(`Transferred ${formatQty(Number(qty))} ${selectedItem?.uom ?? ""} of ${selectedItem?.item_code ?? "item"}`)
    handleClose(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <Label className="text-xs">Item</Label>
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="mt-1" disabled={!!initialItemId}>
              <option value="">Select item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} className="mt-1" disabled={!!initialFromLocationId}>
                <option value="">Select…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className="mt-1">
                <option value="">Select…</option>
                {locations.filter((l) => l.id !== fromLocationId).map((l) => (
                  <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {itemId && fromLocationId && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Available at source: {formatQty(current?.balance_qty ?? 0)} {selectedItem?.uom}
            </p>
          )}

          <div>
            <Label className="text-xs">Quantity {selectedItem && `(${selectedItem.uom})`}</Label>
            <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" />
          </div>

          <p className="text-xs text-muted-foreground">
            Value moves with the stock — both locations end up valued at the source&rsquo;s current average cost.
            Total stock value is unaffected by a transfer.
          </p>

          <div>
            <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" rows={2} placeholder="e.g. consolidating Wire stock into Box 3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>{busy ? "Transferring…" : "Transfer Stock"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
