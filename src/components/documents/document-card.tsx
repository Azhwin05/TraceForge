"use client"

import { useState, useTransition } from "react"
import { Download, ExternalLink, FileText, Loader2, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatFileSize, filenameFromPath, STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { Button } from "@/components/ui/button"
import type { Document } from "@/types/database"

type DocumentCardProps = {
  /** Full document registry record (preferred). */
  document?: Document | null
  /** Supabase Storage path when a full Document record is not available. */
  storagePath?: string | null
  /** Legacy external URL for records that predate Storage uploads. */
  legacyDocUrl?: string | null
  /** Optional heading shown above the card. */
  label?: string
  /** Compact single-line variant for use inside lists. */
  compact?: boolean
}

export function DocumentCard({
  document,
  storagePath,
  legacyDocUrl,
  label,
  compact = false,
}: DocumentCardProps) {
  const [isPending, startTransition] = useTransition()
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Resolve the effective storage path: prefer full record, fallback to prop
  const effectivePath = document?.storage_path ?? storagePath ?? null
  const effectiveLegacyUrl = legacyDocUrl ?? null

  function handleDownload() {
    if (!effectivePath) return
    setDownloadError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(effectivePath, 3600) // 1-hour signed URL

      if (error || !data?.signedUrl) {
        setDownloadError("Could not generate download link. Try again.")
        return
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer")
    })
  }

  // ── Storage document ────────────────────────────────────────────────────
  if (effectivePath) {
    const displayName =
      document?.document_name ?? document?.file_name ?? filenameFromPath(effectivePath)
    const uploadDate = document?.uploaded_at
      ? new Date(document.uploaded_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null

    if (compact) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-[160px] truncate text-xs">{displayName}</span>
          {document?.version && (
            <span className="shrink-0 text-xs text-muted-foreground">v{document.version}</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            disabled={isPending}
            onClick={handleDownload}
            aria-label="Download"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
          {downloadError && (
            <span className="text-xs text-destructive">{downloadError}</span>
          )}
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-border px-3 py-2.5">
        {label && (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{displayName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pl-5 text-xs text-muted-foreground">
              {document?.version && <span>Version {document.version}</span>}
              {document?.file_size && <span>{formatFileSize(document.file_size)}</span>}
              {uploadDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {uploadDate}
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleDownload}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                View / Download
              </>
            )}
          </Button>
        </div>
        {downloadError && (
          <p className="mt-1 text-xs text-destructive">{downloadError}</p>
        )}
      </div>
    )
  }

  // ── Legacy external URL ─────────────────────────────────────────────────
  if (effectiveLegacyUrl) {
    if (compact) {
      return (
        <a
          href={effectiveLegacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          External link
        </a>
      )
    }
    return (
      <div className="rounded-lg border border-border px-3 py-2.5">
        {label && (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        )}
        <a
          href={effectiveLegacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View external document (legacy link)
        </a>
      </div>
    )
  }

  // ── No document ─────────────────────────────────────────────────────────
  if (compact) return null
  return (
    <p className="text-xs text-muted-foreground">No document uploaded yet.</p>
  )
}
