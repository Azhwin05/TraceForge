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
    case "closed": return "bg-green-100 text-green-700"
    case "dispatched":
    case "accounts_processing": return "bg-emerald-100 text-emerald-700"
    case "dispatch_ready":
    case "reports_complete": return "bg-blue-100 text-blue-700"
    case "on_hold": return "bg-red-100 text-red-700"
    case "created": return "bg-gray-100 text-gray-700"
    default: return "bg-amber-100 text-amber-700"
  }
}
