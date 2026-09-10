import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Every page opened with its own hand-rolled `<h1 className="text-2xl ...">`
 * block, so title size, description colour and action alignment drifted apart
 * across ~40 routes. This is the single header contract.
 */
function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ElementType
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground shadow-xs">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}

export { PageHeader }
