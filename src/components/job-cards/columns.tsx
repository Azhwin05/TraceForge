"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpDown, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { cn } from "@/lib/utils"
import { dueInfo, jobAging, DUE_LEVEL_STYLE } from "@/lib/job-aging"
import type { JobCardWithRelations, ProcessType } from "@/types/database"

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "1 day"
  return `${days} days`
}

const PROCESS_LABELS: Record<ProcessType, string> = {
  welding: "Welding",
  machining: "Machining",
  cladding: "Cladding",
  overlay: "Overlay",
}

export const jobCardColumns: ColumnDef<JobCardWithRelations>[] = [
  {
    accessorKey: "jc_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-auto py-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        JC Number <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/job-cards/${row.original.id}`}
        className="group inline-flex items-center gap-1 whitespace-nowrap font-medium text-brand-700 hover:underline dark:text-brand-600"
      >
        {row.getValue("jc_number")}
        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </Link>
    ),
  },
  {
    accessorKey: "client.name",
    id: "client_name",
    header: "Client",
    cell: ({ row }) => (
      // Long company names ("INVENT CAST PVT LTD") wrapped to four lines and
      // tripled the row height; the table scrolls sideways instead.
      <span
        className="block max-w-[12rem] truncate text-sm"
        title={row.original.client?.name ?? undefined}
      >
        {row.original.client?.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "nbdn_number",
    header: "NBDN #",
    cell: ({ getValue }) => <span className="text-sm font-mono">{getValue() as string}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ getValue }) => (
      <span className="max-w-[200px] truncate block text-sm text-muted-foreground" title={getValue() as string}>
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "process_type",
    header: "Process",
    cell: ({ getValue }) => {
      const types = (getValue() as ProcessType[] | null) ?? []
      if (types.length === 0) return <span className="text-muted-foreground">—</span>

      // A job routinely carries 4 processes. Wrapping them all stacked four
      // chips per row and tripled the height of the whole table, so overflow
      // collapses into a +N chip that names the rest on hover.
      const shown = types.slice(0, 2)
      const rest = types.slice(2)

      return (
        <div className="flex items-center gap-1">
          {shown.map((t) => (
            <span
              key={t}
              className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground"
            >
              {PROCESS_LABELS[t]}
            </span>
          ))}
          {rest.length > 0 && (
            <span
              title={rest.map((t) => PROCESS_LABELS[t]).join(", ")}
              className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground"
            >
              +{rest.length}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue() as JobCardWithRelations["status"]} />,
    filterFn: (row, _, filterValue) => {
      if (!filterValue || filterValue === "all") return true
      return row.original.status === filterValue
    },
  },
  {
    accessorKey: "stage_entered_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-auto py-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        At Stage <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{daysAgo(getValue() as string)}</span>
    ),
  },
  {
    accessorKey: "received_date",
    header: "Received",
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(getValue() as string).toLocaleDateString("en-IN")}
      </span>
    ),
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-auto py-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Due Date <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const info = dueInfo(row.original.due_date, row.original.status)
      const style = DUE_LEVEL_STYLE[info.level]
      return (
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} title={style.label} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm">
              {row.original.due_date ? new Date(row.original.due_date).toLocaleDateString("en-IN") : "—"}
            </span>
            {info.level === "overdue" && (
              <span className="text-xs text-danger">{info.overdueDays}d overdue</span>
            )}
            {info.level === "due_soon" && (
              <span className="text-xs text-warning">
                {info.daysToDue === 0 ? "Due today" : `Due in ${info.daysToDue}d`}
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    id: "aging",
    header: "Aging",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{jobAging(row.original.created_at)}d</span>
    ),
  },
]
