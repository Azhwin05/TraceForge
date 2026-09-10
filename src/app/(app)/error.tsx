"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-danger-border bg-danger-surface text-danger"
        >
          <AlertTriangle className="h-5 w-5" />
        </span>

        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          This page couldn&rsquo;t be loaded. Your work has not been lost — try
          again, and if it keeps happening send the reference below to your
          administrator.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/home" />}>
            <ArrowLeft />
            Back to modules
          </Button>
        </div>

        {/* The raw message can carry query or schema detail, so it is available
            for support but not presented as the headline. */}
        {(error.digest || error.message) && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
              Technical details
            </summary>
            <div className="mt-2 rounded-lg border border-border bg-surface-sunken p-3">
              {error.digest && (
                <p className="font-mono text-2xs text-muted-foreground">
                  Reference: {error.digest}
                </p>
              )}
              {error.message && (
                <p className="mt-1 break-words font-mono text-2xs text-muted-foreground">
                  {error.message}
                </p>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
