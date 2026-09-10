"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { History, ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import type { AuditLog } from "@/types/database"

type AuditEntry = AuditLog & { performer: { full_name: string } | null }

const ENTITY_COLORS: Record<string, string> = {
  job_card: "bg-info-surface text-info",
  wps_qualification: "bg-warning-surface text-warning",
  pwht_run: "bg-info-surface text-info",
  dispatch: "bg-info-surface text-info",
  account: "bg-success-surface text-success",
  profile: "bg-danger-surface text-danger",
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-success-surface text-success",
  UPDATE: "bg-warning-surface text-warning",
  DELETE: "bg-danger-surface text-danger",
}

function formatValue(val: Record<string, unknown> | null) {
  if (!val || Object.keys(val).length === 0) return null
  return JSON.stringify(val, null, 2)
}

export function AuditClient({
  entries,
  page,
  totalPages,
  totalCount,
}: {
  entries: AuditEntry[]
  page: number
  totalPages: number
  totalCount: number
}) {
  const router = useRouter()
  const [entityFilter, setEntityFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const entityTypes = ["all", ...Array.from(new Set(entries.map((e) => e.entity_type)))]

  const filtered = entityFilter === "all"
    ? entries
    : entries.filter((e) => e.entity_type === entityFilter)

  function goToPage(p: number) {
    router.push(`/audit?page=${p}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount} total event{totalCount !== 1 ? "s" : ""} · page {page} of {totalPages}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {entityTypes.map((type) => (
          <button
            key={type}
            onClick={() => setEntityFilter(type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              entityFilter === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {type === "all" ? "All" : type.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit events match"
          description="The audit trail records every status change, edit and deletion. Try widening the date range or clearing the filters."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id
            const hasDetails = entry.old_value || entry.new_value
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                <div
                  className={`flex items-start justify-between px-4 py-3 ${hasDetails ? "cursor-pointer hover:bg-muted/30" : ""}`}
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ENTITY_COLORS[entry.entity_type] ?? "bg-muted text-foreground"}`}>
                        {entry.entity_type.replace(/_/g, " ")}
                      </span>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ACTION_COLORS[entry.action] ?? "bg-muted text-foreground"}`}>
                        {entry.action}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {entry.performer?.full_name ?? "System"}
                        <span className="font-normal text-muted-foreground ml-1 lowercase">
                          {entry.action === "INSERT" ? "created" : entry.action === "UPDATE" ? "updated" : "deleted"} a {entry.entity_type.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        ID: {entry.entity_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 ml-4 text-right">
                    <p>{new Date(entry.performed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p>{new Date(entry.performed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                    {hasDetails && (
                      <p className="text-brand-primary mt-1">{isExpanded ? "▲ hide" : "▼ details"}</p>
                    )}
                  </div>
                </div>
                {isExpanded && hasDetails && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {entry.old_value && Object.keys(entry.old_value).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Before</p>
                        <pre className="text-xs bg-card rounded border border-border p-2 overflow-auto max-h-40 text-foreground">
                          {formatValue(entry.old_value)}
                        </pre>
                      </div>
                    )}
                    {entry.new_value && Object.keys(entry.new_value).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">After</p>
                        <pre className="text-xs bg-card rounded border border-border p-2 overflow-auto max-h-40 text-foreground">
                          {formatValue(entry.new_value)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
