import * as React from "react"
import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Replaces bare "No documents found." lines. An empty state should say what the
 * area is for and what to do next, not just report absence — especially on a
 * shop floor where the reader may not know whether it is empty or broken.
 */
function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
}: {
  icon?: React.ElementType
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-sunken/60 px-6 text-center",
        compact ? "py-8" : "py-14",
        className
      )}
    >
      <span
        aria-hidden
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-xs"
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-md font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export { EmptyState }
