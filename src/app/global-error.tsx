"use client"

import { useEffect } from "react"

/**
 * Last-resort boundary. Catches failures in the ROOT layout itself, which the
 * per-segment error.tsx files can't reach — without this the browser shows a
 * blank white page. Must render its own <html>/<body>, because the root layout
 * is exactly what has failed.
 *
 * Deliberately dependency-free (inline styles, no imports from the design
 * system): anything it imported could be the very module that blew up.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error]", error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: "0 0 8px" }}>
              ValveTrack couldn&rsquo;t load
            </h1>
            <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px", lineHeight: 1.5 }}>
              Something went wrong while starting the page. Your data is safe — nothing was changed.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", margin: "0 0 16px" }}>
                Reference: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: "#0f172a", color: "#fff", border: 0, borderRadius: 8,
                padding: "8px 16px", fontSize: 14, cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
