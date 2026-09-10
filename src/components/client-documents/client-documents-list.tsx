"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Undo2, XCircle, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { revokeClientDocument, restoreClientDocument, updateClientDocumentBillDate } from "@/app/(app)/client-documents/actions"
import { formatFileSize } from "@/lib/documents/storage-utils"

export type ClientDocRow = {
  id: string
  title: string
  description: string | null
  label: string | null
  bill_date: string | null
  file_name: string
  file_size_bytes: number | null
  is_active: boolean
  uploaded_at: string
  clients: { name: string } | null
  uploader: { full_name: string } | null
}

function BillDateEditor({ id, billDate }: { id: string; billDate: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(billDate ?? "")
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await updateClientDocumentBillDate(id, value || null)
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Bill date updated")
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="h-6 w-32 text-xs" />
        <button onClick={save} disabled={busy} aria-label="Save bill date"><Check className="h-3.5 w-3.5 text-green-600" /></button>
        <button onClick={() => { setValue(billDate ?? ""); setEditing(false) }} aria-label="Cancel"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
      </span>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 hover:text-foreground">
      {billDate
        ? `Bill date ${new Date(billDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : "Set bill date"}
      <Pencil className="h-3 w-3" />
    </button>
  )
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
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>
                {r.file_name}
                {r.file_size_bytes != null && ` (${formatFileSize(r.file_size_bytes)})`}
                {" · uploaded "}
                {new Date(r.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {r.uploader?.full_name && ` · by ${r.uploader.full_name}`}
              </span>
              <span>·</span>
              <BillDateEditor id={r.id} billDate={r.bill_date} />
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
