import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <Skeleton className="h-10 w-10 rounded-full mx-auto mb-3" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  )
}
