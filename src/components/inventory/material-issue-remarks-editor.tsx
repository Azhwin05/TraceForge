"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Check, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateMaterialIssueRemarks } from "@/app/(app)/inventory/material-issues/actions"

/**
 * Inline-editable remarks, matching the click-to-edit pattern already used
 * for job-card due dates. Client feedback: remarks on a Material Issue were
 * locked after creation — this makes them editable any time, the same way
 * Item Master fields already are.
 */
export function MaterialIssueRemarksEditor({
  issueId, remarks, canEdit,
}: {
  issueId: string
  remarks: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(remarks ?? "")

  function save() {
    startTransition(async () => {
      const result = await updateMaterialIssueRemarks(issueId, value)
      if (result.error) {
        toast.error("Could not save remarks", { description: result.error })
      } else {
        toast.success("Remarks updated")
        setEditing(false)
        router.refresh()
      }
    })
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2} className="text-sm" />
        <div className="flex gap-1.5">
          <Button size="sm" disabled={isPending} onClick={save}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
          <Button
            size="sm" variant="ghost"
            onClick={() => { setValue(remarks ?? ""); setEditing(false) }}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {remarks || <span className="italic">No remarks</span>}
      </p>
      {canEdit && (
        <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
