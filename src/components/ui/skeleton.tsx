import { cn } from "@/lib/utils"

/**
 * A sweeping highlight rather than a pulsing block — pulse reads as "broken
 * flashing element" on dense pages where a dozen of them animate in sync.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.06] after:to-transparent",
        className
      )}
      {...props}
    />
  )
}

/** Convenience wrapper for the common "N stacked rows" loading pattern. */
function SkeletonRows({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonRows }
