import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { TONE_PLATE, type Tone } from "@/lib/tone"

/**
 * KPI tile. The metric is the loudest thing in the card; the icon is a quiet
 * plate rather than a saturated blob, so a row of six does not read as a
 * rainbow of unrelated badges.
 */
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ElementType
  tone?: Tone
  href?: string
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            aria-hidden
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              TONE_PLATE[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-foreground tabular">
        {value}
      </p>
      {hint && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {href && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition-opacity duration-150 group-hover/stat:opacity-100 dark:text-brand-600">
          View
          <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </>
  )

  const base = cn(
    "group/stat rounded-xl border border-border bg-card p-4 shadow-sm",
    href &&
      "transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-px hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className
  )

  if (href) {
    return (
      <Link href={href} className={cn(base, "block")}>
        {body}
      </Link>
    )
  }
  return <div className={base}>{body}</div>
}

export { StatCard }
