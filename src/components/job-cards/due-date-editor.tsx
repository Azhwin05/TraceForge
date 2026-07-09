"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { dueInfo, jobAging, DUE_LEVEL_STYLE } from "@/lib/job-aging"
import { updateJobCardDueDate } from "@/app/(app)/job-cards/actions"
import type { JobCardStatus } from "@/types/database"

export function DueDateEditor({
  jobCardId,
  dueDate,
  createdAt,
  status,
  canEdit,
}: {
  jobCardId: string
  dueDate: string | null
  createdAt: string
  status: JobCardStatus
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dueDate ?? "")

  const info = dueInfo(dueDate, status)
  const style = DUE_LEVEL_STYLE[info.level]
  const aging = jobAging(createdAt)

  function save() {
    startTransition(async () => {
      const result = await updateJobCardDueDate(jobCardId, value || null)
      if (result.error) {
        toast.error("Could not save due date", { description: result.error })
      } else {
        toast.success("Due date updated")
        setEditing(false)
        router.refresh()
      }
    })
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[120px_1fr] items-center gap-2">
        <span className="text-sm text-muted-foreground">Due Date</span>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8"
          />
          <Button size="xs" disabled={isPending} onClick={save}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="xs" variant="ghost" disabled={isPending} onClick={() => { setValue(dueDate ?? ""); setEditing(false) }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <span className="text-sm text-muted-foreground">Due Date</span>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} title={style.label} />
        <span className="text-sm font-medium">
          {dueDate
            ? new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : <span className="text-muted-foreground">Not set</span>}
        </span>
        {info.level === "overdue" && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-medium", DUE_LEVEL_STYLE.overdue.badge)}>
            {info.overdueDays}d overdue
          </span>
        )}
        {info.level === "due_soon" && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-medium", DUE_LEVEL_STYLE.due_soon.badge)}>
            {info.daysToDue === 0 ? "Due today" : `Due in ${info.daysToDue}d`}
          </span>
        )}
        <span className="text-xs text-muted-foreground">· {aging}d aging</span>
        {canEdit && (
          <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
