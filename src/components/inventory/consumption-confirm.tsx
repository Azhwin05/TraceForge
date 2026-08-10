"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Scale } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { formatQty } from "@/lib/format"
import { confirmConsumption } from "@/app/(app)/inventory/material-issues/actions"
import { qtyFromWeights } from "@/lib/inventory/weight"

type Line = {
  id: string
  issued_qty: number
  uom: string
  item_master: {
    item_code: string
    item_name: string
    category?: string | null
    /** kg per stocking unit; null when the item is already stocked in kg. */
    kg_per_unit?: number | null
  } | null
}

export function ConsumptionConfirm({ issueId, lines }: { issueId: string; lines: Line[] }) {
  const router = useRouter()
  const [consumed, setConsumed] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, String(l.issued_qty)])),
  )
  const [before, setBefore] = useState<Record<string, string>>({})
  const [after, setAfter] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function returnedFor(l: Line): number {
    const c = Number(consumed[l.id])
    if (Number.isNaN(c)) return 0
    return Math.max(0, Number((l.issued_qty - c).toFixed(3)))
  }

  /**
   * When both weights are filled in, derive the used quantity. Kept as an
   * explicit recalculation rather than a locked/read-only field so an operator
   * can still override it — the weights are evidence, not an authority.
   */
  function applyWeights(l: Line, nextBefore: string, nextAfter: string) {
    const b = Number(nextBefore)
    const a = Number(nextAfter)
    if (nextBefore === "" || nextAfter === "" || Number.isNaN(b) || Number.isNaN(a)) return

    const qty = qtyFromWeights(b, a, l.uom, l.item_master?.kg_per_unit)
    if (qty == null) return
    setConsumed((prev) => ({ ...prev, [l.id]: String(Math.min(qty, l.issued_qty)) }))
  }

  function weightNote(l: Line): string | null {
    const b = before[l.id], a = after[l.id]
    if (!b || !a) return null
    if (Number(a) > Number(b)) return "Weight after cannot exceed weight before."
    if (l.uom.trim().toLowerCase() === "kg") return null
    if (!l.item_master?.kg_per_unit) {
      return `Set "kg per ${l.uom}" on this item to convert weight into ${l.uom}.`
    }
    return null
  }

  async function submit() {
    setError(null)
    for (const l of lines) {
      const c = Number(consumed[l.id])
      if (Number.isNaN(c) || c < 0) { setError("Enter a valid used quantity for every line."); return }
      if (c > l.issued_qty) { setError(`Used quantity for ${l.item_master?.item_code} exceeds issued.`); return }

      const b = before[l.id], a = after[l.id]
      if ((b && !a) || (!b && a)) {
        setError(`Enter both before and after weights for ${l.item_master?.item_code}, or neither.`)
        return
      }
      if (b && a && Number(a) > Number(b)) {
        setError(`Weight after cannot exceed weight before for ${l.item_master?.item_code}.`)
        return
      }
    }

    setBusy(true)
    const res = await confirmConsumption(issueId, {
      items: lines.map((l) => ({
        id: l.id,
        consumed_qty: Number(consumed[l.id]),
        weight_before_kg: before[l.id] ? Number(before[l.id]) : null,
        weight_after_kg:  after[l.id]  ? Number(after[l.id])  : null,
      })),
    })
    setBusy(false)
    if (res.error) { setError(res.error); return }
    toast.success("Usage confirmed — unused material returned to stock")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter how much of each material was actually used. Any unused balance is returned to stock.
        For welding consumables you can weigh the coil before and after instead — the used quantity
        is calculated from the difference.
      </p>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {lines.map((l) => {
          const returned = returnedFor(l)
          const note = weightNote(l)
          return (
            <div key={l.id} className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <div>
                  <p className="text-sm font-medium">{l.item_master?.item_code} — {l.item_master?.item_name}</p>
                  <p className="text-xs text-muted-foreground">Issued {formatQty(l.issued_qty)} {l.uom}</p>
                </div>
                <div>
                  <Label className="text-xs">Used ({l.uom})</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={consumed[l.id] ?? ""}
                    onChange={(e) => setConsumed((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Returns to stock</Label>
                  <p className={`mt-1 py-2 text-sm font-medium tabular-nums ${returned > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {formatQty(returned)} {l.uom}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-dashed border-border pt-3 sm:grid-cols-[2fr_1fr_1fr]">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  Weigh-in / weigh-out (optional)
                </div>
                <div>
                  <Label className="text-xs">Weight before (kg)</Label>
                  <Input
                    type="number" step="0.001" min="0"
                    value={before[l.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value
                      setBefore((prev) => ({ ...prev, [l.id]: v }))
                      applyWeights(l, v, after[l.id] ?? "")
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight after (kg)</Label>
                  <Input
                    type="number" step="0.001" min="0"
                    value={after[l.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value
                      setAfter((prev) => ({ ...prev, [l.id]: v }))
                      applyWeights(l, before[l.id] ?? "", v)
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {note && <p className="text-xs text-amber-700">{note}</p>}
            </div>
          )
        })}
      </div>
      <Button onClick={submit} disabled={busy}>
        {busy ? "Confirming…" : "Confirm Usage"}
      </Button>
    </div>
  )
}
