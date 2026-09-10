import { cn } from "@/lib/utils"
import type { JobCardStatus } from "@/types/database"

// Each step maps to one or more underlying statuses. "Ready" (dispatch_ready)
// and "Dispatched" are merged into a single "Dispatch" step.
const STEPS: { label: string; statuses: JobCardStatus[] }[] = [
  { label: "Created",         statuses: ["created"] },
  { label: "WPS Pending",     statuses: ["wps_pending"] },
  { label: "WPS Uploaded",    statuses: ["wps_uploaded"] },
  { label: "WPS Approved",    statuses: ["wps_approved"] },
  { label: "Assigned",        statuses: ["process_assigned"] },
  { label: "In Process",      statuses: ["in_process"] },
  { label: "Process Done",    statuses: ["process_complete"] },
  { label: "Reports Pending", statuses: ["reports_pending"] },
  { label: "Reports Done",    statuses: ["reports_complete"] },
  { label: "Dispatch",        statuses: ["dispatch_ready", "dispatched"] },
  { label: "Accounts",        statuses: ["accounts_processing"] },
  { label: "Closed",          statuses: ["closed"] },
]

export function StatusTimeline({ status }: { status: JobCardStatus }) {
  if (status === "on_hold") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-danger-surface border border-danger-border px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
        <span className="text-sm font-medium text-danger">Job card is on hold</span>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((step) => step.statuses.includes(status))

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max">
        {STEPS.map((step, i) => {
          const s = step.label
          const isDone = i < currentIndex
          const isCurrent = i === currentIndex
          const isUpcoming = i > currentIndex

          return (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    isDone && "border-brand-accent bg-accent text-accent-foreground",
                    isCurrent && "border-brand-primary bg-primary text-primary-foreground shadow-md",
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
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
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
