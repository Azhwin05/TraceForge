"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { formatQty } from "@/lib/format"
import { confirmConsumption } from "@/app/(app)/inventory/material-issues/actions"

type Line = {
  id: string
  issued_qty: number
  uom: string
  item_master: { item_code: string; item_name: string } | null
}

export function ConsumptionConfirm({ issueId, lines }: { issueId: string; lines: Line[] }) {
  const router = useRouter()
  const [consumed, setConsumed] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, String(l.issued_qty)])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function returnedFor(l: Line): number {
    const c = Number(consumed[l.id])
    if (Number.isNaN(c)) return 0
    return Math.max(0, Number((l.issued_qty - c).toFixed(3)))
  }

  async function submit() {
    setError(null)
    // Client-side guard mirrors the server: consumed can't exceed issued.
    for (const l of lines) {
      const c = Number(consumed[l.id])
      if (Number.isNaN(c) || c < 0) { setError("Enter a valid used quantity for every line."); return }
      if (c > l.issued_qty) { setError(`Used quantity for ${l.item_master?.item_code} exceeds issued.`); return }
    }
    setBusy(true)
    const res = await confirmConsumption(issueId, {
      items: lines.map((l) => ({ id: l.id, consumed_qty: Number(consumed[l.id]) })),
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
      </p>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {lines.map((l) => {
          const returned = returnedFor(l)
          return (
            <div key={l.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr]">
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
          )
        })}
      </div>
      <Button onClick={submit} disabled={busy}>
        {busy ? "Confirming…" : "Confirm Usage"}
      </Button>
    </div>
  )
}
