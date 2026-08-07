import Link from "next/link"

/**
 * App-wide 404. Without this, a mistyped URL or a notFound() call (used by the
 * job-card / report / customer detail pages when a record doesn't exist) fell
 * through to Next's unstyled default page.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">We couldn&rsquo;t find that page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The record may have been deleted, or the link may be out of date.
      </p>
      <Link
        href="/home"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
      >
        Back to ValveTrack
      </Link>
    </div>
  )
}
