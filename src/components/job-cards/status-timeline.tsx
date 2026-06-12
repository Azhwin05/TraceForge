import { cn } from "@/lib/utils"
import type { JobCardStatus } from "@/types/database"

const ORDERED_STATUSES: JobCardStatus[] = [
  "created", "wps_pending", "wps_uploaded", "wps_approved",
  "process_assigned", "in_process", "process_complete",
  "reports_pending", "reports_complete",
  "dispatch_ready", "dispatched",
  "accounts_processing", "closed",
]

const STATUS_LABELS: Record<JobCardStatus, string> = {
  created: "Created",
  wps_pending: "WPS Pending",
  wps_uploaded: "WPS Uploaded",
  wps_approved: "WPS Approved",
  process_assigned: "Assigned",
  in_process: "In Process",
  process_complete: "Process Done",
  reports_pending: "Reports Pending",
  reports_complete: "Reports Done",
  dispatch_ready: "Ready",
  dispatched: "Dispatched",
  accounts_processing: "Accounts",
  closed: "Closed",
  on_hold: "On Hold",
}

export function StatusTimeline({ status }: { status: JobCardStatus }) {
  if (status === "on_hold") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 dark:bg-red-900/10 dark:border-red-800">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-medium text-red-700 dark:text-red-400">Job card is on hold</span>
      </div>
    )
  }

  const currentIndex = ORDERED_STATUSES.indexOf(status)

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max">
        {ORDERED_STATUSES.map((s, i) => {
          const isDone = i < currentIndex
          const isCurrent = i === currentIndex
          const isUpcoming = i > currentIndex

          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    isDone && "border-brand-accent bg-brand-accent text-white",
                    isCurrent && "border-brand-primary bg-brand-primary text-white shadow-md",
                    isUpcoming && "border-muted-foreground/30 bg-background text-muted-foreground/50"
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] text-center max-w-[64px] leading-tight",
                    isCurrent && "font-semibold text-brand-primary dark:text-brand-accent",
                    isDone && "text-muted-foreground",
                    isUpcoming && "text-muted-foreground/50"
                  )}
                >
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < ORDERED_STATUSES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-0.5 -mt-4 transition-colors",
                    i < currentIndex ? "bg-brand-accent" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
