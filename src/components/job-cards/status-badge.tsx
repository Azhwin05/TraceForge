import { cn } from "@/lib/utils"
import type { JobCardStatus } from "@/types/database"

const STATUS_CONFIG: Record<JobCardStatus, { label: string; className: string }> = {
  created:              { label: "Created",              className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  wps_pending:          { label: "WPS Pending",          className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  wps_uploaded:         { label: "WPS Uploaded",         className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  wps_approved:         { label: "WPS Approved",         className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  process_assigned:     { label: "Process Assigned",     className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  in_process:           { label: "In Process",           className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  process_complete:     { label: "Process Complete",     className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  reports_pending:      { label: "Reports Pending",      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  reports_complete:     { label: "Reports Complete",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  dispatch_ready:       { label: "Dispatch Ready",       className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  dispatched:           { label: "Dispatched",           className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  accounts_processing:  { label: "Accounts Processing",  className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  closed:               { label: "Closed",               className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  on_hold:              { label: "On Hold",              className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export function StatusBadge({
  status,
  className,
}: {
  status: JobCardStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-700" }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
