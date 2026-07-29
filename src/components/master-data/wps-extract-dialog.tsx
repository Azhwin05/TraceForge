"use client"

import { useRef, useState } from "react"
import { Sparkles, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { extractWpsFromDocument } from "@/app/(app)/master-data/wps/actions"

export function WpsExtractDialog({
  onExtracted,
}: {
  onExtracted: (data: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClose(next: boolean) {
    if (!next) {
      setFile(null)
      setError(null)
      if (inputRef.current) inputRef.current.value = ""
    }
    setOpen(next)
  }

  async function handleExtract() {
    if (!file) { setError("Choose a PDF or image first."); return }
    setError(null)
    setBusy(true)

    const formData = new FormData()
    formData.append("file", file)
    const result = await extractWpsFromDocument(formData)

    setBusy(false)
    if (result.error) { setError(result.error); return }
    if (result.data) {
      onExtracted(result.data)
      toast.success("Fields extracted — please review before saving.")
      handleClose(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="mr-1.5 h-4 w-4" /> Extract from PDF/Image
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extract WPS from PDF/Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a scanned WPS document — fields it can read will pre-fill the form below.
              Nothing is saved yet; review and correct before submitting.
            </p>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <label
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center hover:bg-muted/40"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">
                {file ? file.name : "Click to choose a PDF, JPEG, PNG, or WEBP"}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleExtract} disabled={busy || !file}>
              {busy ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Reading document…</> : "Extract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
