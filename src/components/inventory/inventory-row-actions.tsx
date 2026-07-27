"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Power } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

/**
 * Delete + Activate/Deactivate for an inventory master record (item, supplier,
 * storage location). Shared across all three so the UX and error handling
 * stay identical. Delete is admin-only and pre-guarded server-side against
 * real transaction history; the dialog surfaces that reason directly instead
 * of a raw error, and points at Deactivate as the alternative.
 */
export function InventoryRowActions({
  label,
  isActive,
  canDeactivate,
  canDelete,
  onDelete,
  onToggleActive,
}: {
  /** e.g. "RM-001 — SS316 Bar" — shown in the confirm dialog */
  label: string
  isActive: boolean
  canDeactivate: boolean
  canDelete: boolean
  onDelete: () => Promise<{ error?: string }>
  onToggleActive: (next: boolean) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleToggle() {
    setBusy(true)
    const res = await onToggleActive(!isActive)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(isActive ? "Deactivated" : "Activated")
      router.refresh()
    }
  }

  async function handleDelete() {
    setBusy(true)
    const res = await onDelete()
    setBusy(false)
    if (res.error) {
      toast.error("Couldn't delete", { description: res.error })
      return
    }
    setConfirmOpen(false)
    toast.success(`${label} deleted`)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {canDeactivate && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={handleToggle} title={isActive ? "Deactivate" : "Activate"}>
          <Power className="h-3.5 w-3.5" />
        </Button>
      )}
      {canDelete && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmOpen(true)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {label}?</DialogTitle>
            <DialogDescription>
              This permanently removes it. If it has any transaction history
              (stock movement, GRN, or issue records), the delete is blocked —
              deactivate it instead so it stays in your records but stops
              showing up in new transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-4 w-4" /> {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
