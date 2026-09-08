"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getClientDocumentSignedUrl } from "@/app/portal/actions"

export function ClientDocumentDownloadButton({ documentId }: { documentId: string }) {
  const [busy, setBusy] = useState(false)

  async function handleDownload() {
    setBusy(true)
    const res = await getClientDocumentSignedUrl(documentId)
    setBusy(false)
    if (res.error || !res.url) { toast.error(res.error ?? "Could not open this document"); return }
    window.open(res.url, "_blank", "noopener,noreferrer")
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={busy}>
      <Download className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Opening…" : "Download"}
    </Button>
  )
}
