"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updateJobCardStatus } from "@/app/(app)/job-cards/actions"
import type { JobCardStatus, UserRole } from "@/types/database"

type Transition = {
  label: string
  nextStatus: JobCardStatus
  roles: UserRole[]
  variant?: "default" | "destructive" | "outline"
  confirm?: string
}

const TRANSITIONS: Partial<Record<JobCardStatus, Transition[]>> = {
  created: [
    { label: "Request WPS", nextStatus: "wps_pending", roles: ["admin", "operator", "qa"] },
  ],
  wps_pending: [],
  wps_uploaded: [],
  wps_approved: [
    { label: "Assign to Process", nextStatus: "process_assigned", roles: ["admin"] },
  ],
  process_assigned: [
    { label: "Start Processing", nextStatus: "in_process", roles: ["admin", "engineer"] },
  ],
  in_process: [
    { label: "Mark Process Complete", nextStatus: "process_complete", roles: ["admin", "engineer"] },
  ],
  process_complete: [
    { label: "Request Reports", nextStatus: "reports_pending", roles: ["admin", "qa"] },
  ],
  reports_pending: [
    { label: "Mark Reports Complete", nextStatus: "reports_complete", roles: ["admin", "qa"] },
  ],
  reports_complete: [
    { label: "Mark Dispatch Ready", nextStatus: "dispatch_ready", roles: ["admin"] },
  ],
  dispatch_ready: [
    { label: "Mark as Dispatched", nextStatus: "dispatched", roles: ["admin"] },
  ],
  dispatched: [
    { label: "Send to Accounts", nextStatus: "accounts_processing", roles: ["admin", "accounts"] },
  ],
  accounts_processing: [
    {
      label: "Close Job Card",
      nextStatus: "closed",
      roles: ["admin", "accounts"],
      variant: "destructive",
      confirm: "This will permanently close the job card. Are you sure?",
    },
  ],
  closed: [],
  on_hold: [],
}

export function StatusActions({
  jobCardId,
  currentStatus,
  previousStatus,
  userRole,
}: {
  jobCardId: string
  currentStatus: JobCardStatus
  previousStatus?: JobCardStatus | null
  userRole: UserRole
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingStatus, setLoadingStatus] = useState<JobCardStatus | null>(null)
  const [confirmState, setConfirmState] = useState<{
    nextStatus: JobCardStatus
    message: string
  } | null>(null)

  const transitions = TRANSITIONS[currentStatus] ?? []
  const allowed = transitions.filter((t) => t.roles.includes(userRole))

  const canHold =
    userRole === "admin" &&
    currentStatus !== "closed" &&
    currentStatus !== "on_hold"
  const canResume = userRole === "admin" && currentStatus === "on_hold"

  if (allowed.length === 0 && !canHold && !canResume) return null

  function handleTransition(nextStatus: JobCardStatus) {
    setLoadingStatus(nextStatus)
    startTransition(async () => {
      const result = await updateJobCardStatus(jobCardId, nextStatus)
      setLoadingStatus(null)
      if (result.error) {
        toast.error("Status update failed", { description: result.error })
      } else {
        toast.success("Status updated")
        router.refresh()
      }
    })
  }

  function requestTransition(t: Transition) {
    if (t.confirm) {
      setConfirmState({ nextStatus: t.nextStatus, message: t.confirm })
    } else {
      handleTransition(t.nextStatus)
    }
  }

  if (confirmState) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
        <p className="text-muted-foreground">{confirmState.message}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              const s = confirmState.nextStatus
              setConfirmState(null)
              handleTransition(s)
            }}
          >
            {isPending ? "Updating..." : "Confirm"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmState(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const resumeTarget = previousStatus ?? "wps_approved"

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((t) => (
        <Button
          key={t.nextStatus}
          variant={t.variant ?? "default"}
          size="sm"
          disabled={isPending}
          onClick={() => requestTransition(t)}
        >
          {loadingStatus === t.nextStatus ? "Updating..." : t.label}
        </Button>
      ))}
      {canHold && (
        <Button
          variant="outline"
          size="sm"
          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          disabled={isPending}
          onClick={() =>
            setConfirmState({
              nextStatus: "on_hold",
              message: "Place this job on hold? You can resume it later.",
            })
          }
        >
          Place on Hold
        </Button>
      )}
      {canResume && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleTransition(resumeTarget)}
        >
          {loadingStatus === resumeTarget ? "Updating..." : "Resume Job"}
        </Button>
      )}
    </div>
  )
}
