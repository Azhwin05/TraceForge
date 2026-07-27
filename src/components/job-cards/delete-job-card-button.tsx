"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { deleteJobCard } from "@/app/(app)/job-cards/actions"

const UNDO_SECONDS = 10

/** The floating toast body: a live countdown with an Undo button. */
function UndoToast({ jcNumber, onUndo }: { jcNumber: string; onUndo: () => void }) {
  const [remaining, setRemaining] = useState(UNDO_SECONDS)

  useEffect(() => {
    const iv = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex w-[340px] items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Trash2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Moving {jcNumber} to Recycle Bin</p>
        <p className="text-xs text-muted-foreground">
          In {remaining}s — undo to keep it here.
        </p>
      </div>
      <button
        onClick={onUndo}
        className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        Undo
      </button>
    </div>
  )
}

export function DeleteJobCardButton({
  jobCardId,
  jcNumber,
}: {
  jobCardId: string
  jcNumber: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function startDelete() {
    setOpen(false)
    // Leave the detail page — you just asked to delete it.
    router.push("/job-cards")

    let cancelled = false
    let toastId: string | number = ""

    // The real delete is deferred; if the window elapses without an undo, it fires.
    const timer = setTimeout(async () => {
      if (cancelled) return
      const res = await deleteJobCard(jobCardId)
      toast.dismiss(toastId)
      if (res.error) {
        toast.error("Couldn't delete job card", { description: res.error })
      } else {
        toast.success(`${jcNumber} moved to Recycle Bin`, { description: "Restorable for 6 months." })
        router.refresh()
      }
    }, UNDO_SECONDS * 1000)

    toastId = toast.custom(
      () => (
        <UndoToast
          jcNumber={jcNumber}
          onUndo={() => {
            cancelled = true
            clearTimeout(timer)
            toast.dismiss(toastId)
            toast.info(`${jcNumber} kept — deletion cancelled`)
          }}
        />
      ),
      { duration: UNDO_SECONDS * 1000 },
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete job card {jcNumber}?</DialogTitle>
            <DialogDescription>
              This moves the job card to the Recycle Bin — nothing is destroyed.
              It stays fully restorable there for 6 months, after which it&rsquo;s
              permanently deleted automatically. You&rsquo;ll have {UNDO_SECONDS}{" "}
              seconds to undo right now before it moves.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={startDelete}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete job card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
