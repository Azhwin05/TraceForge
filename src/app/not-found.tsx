import Link from "next/link"
import { FileQuestion, ArrowLeft, Search } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * App-wide 404. Without this, a mistyped URL or a notFound() call (used by the
 * job-card / report / customer detail pages when a record doesn't exist) fell
 * through to Next's unstyled default page.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-xs"
        >
          <FileQuestion className="h-5 w-5" />
        </span>

        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The record may have been deleted, or the link may be out of date.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button render={<Link href="/home" />}>
            <ArrowLeft />
            Back to ValveTrack
          </Button>
          <Button variant="outline" render={<Link href="/search" />}>
            <Search />
            Search job cards
          </Button>
        </div>
      </div>
    </div>
  )
}
