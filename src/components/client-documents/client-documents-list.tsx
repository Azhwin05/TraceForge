"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Undo2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { revokeClientDocument, restoreClientDocument } from "@/app/(app)/client-documents/actions"
import { formatFileSize } from "@/lib/documents/storage-utils"

export type ClientDocRow = {
  id: string
  title: string
  description: string | null
  label: string | null
  file_name: string
  file_size_bytes: number | null
  is_active: boolean
  uploaded_at: string
  clients: { name: string } | null
  uploader: { full_name: string } | null
}

export function ClientDocumentsList({ records }: { records: ClientDocRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this document? The client will no longer see it in their portal.")) return
    setBusyId(id)
    const res = await revokeClientDocument(id)
    setBusyId(null)
    if (res.error) { toast.error(res.error); return }
    toast.success("Document revoked")
    router.refresh()
  }

  async function handleRestore(id: string) {
    setBusyId(id)
    const res = await restoreClientDocument(id)
    setBusyId(null)
    if (res.error) { toast.error(res.error); return }
    toast.success("Document restored")
    router.refresh()
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No documents sent to clients yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {records.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{r.title}</span>
              {r.label && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {r.label}
                </span>
              )}
              {!r.is_active && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Revoked
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {r.clients?.name ?? "—"}
              {r.description && ` · ${r.description}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.file_name}
              {r.file_size_bytes != null && ` (${formatFileSize(r.file_size_bytes)})`}
              {" · "}
              {new Date(r.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {r.uploader?.full_name && ` · by ${r.uploader.full_name}`}
            </p>
          </div>
          {r.is_active ? (
            <Button
              size="sm" variant="outline"
              className="shrink-0 text-destructive hover:text-destructive"
              disabled={busyId === r.id}
              onClick={() => handleRevoke(r.id)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Revoke
            </Button>
          ) : (
            <Button
              size="sm" variant="outline"
              className="shrink-0"
              disabled={busyId === r.id}
              onClick={() => handleRestore(r.id)}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Restore
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
