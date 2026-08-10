"use client"

import { useState } from "react"
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
import { createRework, updateRework } from "@/app/(app)/rework/actions"
import type { ReworkRecord, ReworkStatus } from "@/types/database"

export type StaffOption = { id: string; full_name: string }

/**
 * Create or edit a rework record. `existing` switches it to edit mode — the
 * job card cannot be changed there, since moving a rework event to a different
 * job would silently rewrite quality history.
 */
export function ReworkDialog({
  jobCardId, jobCardNumber, staff, existing, open, onOpenChange,
}: {
  jobCardId: string
  jobCardNumber?: string
  staff: StaffOption[]
  existing?: ReworkRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const isEdit = !!existing

  const [reworkDate, setReworkDate] = useState(existing?.rework_date ?? new Date().toISOString().slice(0, 10))
  const [stage, setStage] = useState(existing?.stage ?? "")
  const [reason, setReason] = useState(existing?.reason ?? "")
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1))
  const [identifiedBy, setIdentifiedBy] = useState(existing?.identified_by ?? "")
  const [performedBy, setPerformedBy] = useState(existing?.performed_by ?? "")
  const [correctiveAction, setCorrectiveAction] = useState(existing?.corrective_action ?? "")
  const [status, setStatus] = useState<ReworkStatus>(existing?.status ?? "open")
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setReworkDate(existing?.rework_date ?? new Date().toISOString().slice(0, 10))
    setStage(existing?.stage ?? "")
    setReason(existing?.reason ?? "")
    setQuantity(String(existing?.quantity ?? 1))
    setIdentifiedBy(existing?.identified_by ?? "")
    setPerformedBy(existing?.performed_by ?? "")
    setCorrectiveAction(existing?.corrective_action ?? "")
    setStatus(existing?.status ?? "open")
    setNotes(existing?.notes ?? "")
    setError(null)
  }

  function handleClose(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSubmit() {
    setError(null)
    if (!stage.trim())  { setError("Enter the stage where the rework was needed."); return }
    if (!reason.trim()) { setError("A reason is required — this is the record of what went wrong."); return }
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) { setError("Quantity must be a whole number of 1 or more."); return }

    const payload = {
      rework_date: reworkDate,
      stage: stage.trim(),
      reason: reason.trim(),
      quantity: qty,
      identified_by: identifiedBy || null,
      performed_by: performedBy || null,
      corrective_action: correctiveAction.trim() || null,
      status,
      notes: notes.trim() || null,
    }

    setBusy(true)
    const res = isEdit
      ? await updateRework(existing.id, payload)
      : await createRework({ ...payload, job_card_id: jobCardId })
    setBusy(false)

    if (res.error) { setError(res.error); return }
    toast.success(isEdit ? "Rework record updated" : "Rework recorded")
    handleClose(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Rework Record" : "Record Rework"}
            {jobCardNumber && (
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {jobCardNumber}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Rework Date</Label>
              <Input type="date" value={reworkDate} onChange={(e) => setReworkDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Stage</Label>
              <Input
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="e.g. Overlay welding"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number" min={1} step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What was wrong and how was it found?"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Identified By</Label>
              <Select value={identifiedBy} onChange={(e) => setIdentifiedBy(e.target.value)} className="mt-1">
                <option value="">Not recorded</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reworked By</Label>
              <Select value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} className="mt-1">
                <option value="">Not recorded</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReworkStatus)}
                className="mt-1"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Corrective Action</Label>
            <Textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="What was done to fix it, and to stop it recurring?"
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>

          {!isEdit && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Save this record first, then attach photos from the rework entry on the job card.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Record Rework"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
