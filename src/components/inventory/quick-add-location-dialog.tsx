"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { createStorageLocation } from "@/app/(app)/inventory/locations/actions"

export type LocationOption = { id: string; code: string; name: string }

/**
 * Inline "+ Add location" for the Material Inward / Material Issue forms.
 *
 * Client request: they use sub-locations within one physical store — "Box 01",
 * "Box 02" — and want to add a new one themselves, at the point of use, rather
 * than navigating to the separate Storage Locations master-data page first.
 *
 * Deliberately admin-only for now (their instruction) — narrower than the
 * admin+engineer permission already on the master-data page itself, which is
 * untouched. Reuses createStorageLocation, so a location added here is the
 * same real row the master-data page would show, not a shadow list.
 */
export function QuickAddLocationDialog({
  onCreated,
}: {
  onCreated: (location: LocationOption) => void
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setCode(""); setName(""); setError(null)
  }

  async function handleSubmit() {
    setError(null)
    if (!code.trim() || !name.trim()) {
      setError("Enter both a code and a name for the new location.")
      return
    }
    setBusy(true)
    const res = await createStorageLocation({ code: code.trim(), name: name.trim(), description: null })
    setBusy(false)
    if (res.error || !res.id) { setError(res.error ?? "Could not create the location."); return }
    toast.success(`Location "${code.trim()}" added`)
    onCreated({ id: res.id, code: code.trim(), name: name.trim() })
    reset()
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button" variant="outline" size="sm"
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Plus className="h-3.5 w-3.5" /> Add location
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); setOpen(next) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Storage Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BOX-03" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Box 3" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={busy}>{busy ? "Adding…" : "Add Location"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
