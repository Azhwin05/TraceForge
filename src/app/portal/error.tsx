"use client"

import { useEffect } from "react"

/**
 * Customer-facing boundary. Separate from the internal (app)/error.tsx on
 * purpose: that one surfaces error.message to help staff debug, which must
 * never be shown to an external customer. Here the real error goes to the
 * console/monitoring and the customer sees a plain reassurance plus a
 * reference code they can quote to Raghav Engineering.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[portal]", error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h2 className="text-lg font-semibold">This page couldn&rsquo;t be loaded</h2>
      <p className="text-sm text-muted-foreground">
        Sorry — something went wrong on our side. Your jobs and documents are unaffected.
        Please try again, or contact Raghav Engineering if it keeps happening.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  )
}
