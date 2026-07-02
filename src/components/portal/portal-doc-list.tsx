"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileText, Download, Loader2 } from "lucide-react"
import { getCustomerSignedUrl } from "@/app/portal/actions"

type Doc = {
  id: string
  document_name: string | null
  document_type: string
  file_name: string
  storage_path: string
  version: number
}

export function PortalDocList({ docs }: { docs: Doc[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function open(doc: Doc) {
    setLoadingId(doc.id)
    try {
      const res = await getCustomerSignedUrl(doc.storage_path)
      if (res.error || !res.url) {
        toast.error(res.error ?? "Could not open document")
        return
      }
      window.open(res.url, "_blank", "noopener,noreferrer")
    } finally {
      setLoadingId(null)
    }
  }

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents available yet.</p>
  }

  return (
    <ul className="divide-y">
      {docs.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{doc.document_name ?? doc.file_name}</div>
              <div className="text-xs text-muted-foreground">
                {doc.document_type.replace(/_/g, " ")} · v{doc.version}
              </div>
            </div>
          </div>
          <button
            onClick={() => open(doc)}
            disabled={loadingId === doc.id}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {loadingId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download
          </button>
        </li>
      ))}
    </ul>
  )
}
