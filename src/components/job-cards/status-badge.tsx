import { cn } from "@/lib/utils"
import { TONE_CHIP, TONE_SOLID, type Tone } from "@/lib/tone"
import type { JobCardStatus } from "@/types/database"

/**
 * Colour encodes *urgency*, the label encodes the *stage*.
 *
 * The previous version gave all 14 statuses their own hue (purple, teal,
 * orange, blue, amber, green, slate), which made a job list read as a random
 * colour chart — nothing told an operator which rows needed attention. Now:
 *   danger  = stopped, needs a decision
 *   warning = waiting on someone
 *   success = milestone cleared
 *   brand   = ready for the next physical action
 *   info    = moving normally
 *   neutral = inert (not started / finished)
 */
const STATUS_CONFIG: Record<JobCardStatus, { label: string; tone: Tone }> = {
  created: { label: "Created", tone: "neutral" },
  wps_pending: { label: "WPS Pending", tone: "warning" },
  wps_uploaded: { label: "WPS Uploaded", tone: "info" },
  wps_approved: { label: "WPS Approved", tone: "success" },
  process_assigned: { label: "Process Assigned", tone: "info" },
  in_process: { label: "In Process", tone: "info" },
  process_complete: { label: "Process Complete", tone: "success" },
  reports_pending: { label: "Reports Pending", tone: "warning" },
  reports_complete: { label: "Reports Complete", tone: "success" },
  dispatch_ready: { label: "Dispatch Ready", tone: "brand" },
  dispatched: { label: "Dispatched", tone: "info" },
  accounts_processing: { label: "Accounts Processing", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
  on_hold: { label: "On Hold", tone: "danger" },
}

export function StatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: JobCardStatus
  className?: string
  showDot?: boolean
}) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "neutral" as Tone }

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
        TONE_CHIP[config.tone],
        className
      )}
    >
      {showDot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_SOLID[config.tone])}
        />
      )}
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
