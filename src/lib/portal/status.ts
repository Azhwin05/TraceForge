import type { JobCardStatus } from "@/types/database"

/** Customer-facing labels + linear order for the job lifecycle timeline. */
export const STATUS_ORDER: JobCardStatus[] = [
  "created", "wps_pending", "wps_uploaded", "wps_approved",
  "process_assigned", "in_process", "process_complete",
  "reports_pending", "reports_complete", "dispatch_ready",
  "dispatched", "accounts_processing", "closed",
]

export const STATUS_LABEL: Record<JobCardStatus, string> = {
  created: "Received",
  wps_pending: "Awaiting WPS",
  wps_uploaded: "WPS Under Review",
  wps_approved: "WPS Approved",
  process_assigned: "Production Assigned",
  in_process: "In Production",
  process_complete: "Production Complete",
  reports_pending: "Inspection In Progress",
  reports_complete: "Inspection Cleared",
  dispatch_ready: "Ready for Dispatch",
  dispatched: "Dispatched",
  accounts_processing: "Invoicing",
  closed: "Completed",
  on_hold: "On Hold",
}

export function statusBadgeClass(status: JobCardStatus): string {
  switch (status) {
    case "closed": return "bg-success-surface text-success"
    case "dispatched":
    case "accounts_processing": return "bg-success-surface text-success"
    case "dispatch_ready":
    case "reports_complete": return "bg-info-surface text-info"
    case "on_hold": return "bg-danger-surface text-danger"
    case "created": return "bg-muted text-foreground"
    default: return "bg-warning-surface text-warning"
  }
}
