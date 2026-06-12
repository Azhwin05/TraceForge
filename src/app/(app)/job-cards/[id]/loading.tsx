import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              {i < 12 && <Skeleton className="h-0.5 flex-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border p-5 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
