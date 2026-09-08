"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { STORAGE_BUCKET, buildStoragePath } from "@/lib/documents/storage-utils"
import { registerClientDocument } from "@/app/(app)/client-documents/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ClientOption = { id: string; name: string }

/**
 * Admin-only. One PDF, one client — deliberately not a multi-select/reusable
 * upload (the client meeting was explicit this is not a shared/general doc).
 */
export function ClientDocumentUploadForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [clientId, setClientId] = useState("")
  const [title, setTitle] = useState("")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setClientId(""); setTitle(""); setLabel(""); setDescription(""); setFile(null); setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setError(null)
    if (!f) { setFile(null); return }
    if (!f.name.toLowerCase().endsWith(".pdf") || f.type !== "application/pdf") {
      setError("Only PDF files are accepted.")
      e.target.value = ""
      setFile(null)
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50 MB.")
      e.target.value = ""
      setFile(null)
      return
    }
    setFile(f)
  }

  function handleSubmit() {
    setError(null)
    if (!clientId) { setError("Select a client."); return }
    if (!title.trim()) { setError("Title is required."); return }
    if (!file) { setError("Choose a PDF to upload."); return }

    startTransition(async () => {
      const supabase = createClient()
      // client_documents/{clientId}/{documentType}/{date}-{filename} — reuses
      // the existing path builder; "client_documents" is the entity type, the
      // client is the entity, "pdf" stands in for a document-type segment.
      const storagePath = buildStoragePath("client_documents", clientId, "pdf", file.name)

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false })

      if (storageError) {
        setError(storageError.message ?? "Upload failed")
        return
      }

      const res = await registerClientDocument({
        client_id: clientId,
        title: title.trim(),
        label: label.trim() || null,
        description: description.trim() || null,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
      })

      if (res.error) {
        try { await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]) } catch {}
        setError(res.error)
        return
      }

      toast.success("Document sent to client")
      reset()
      router.refresh()
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-5">
      <h2 className="font-semibold">Send a Document to a Client</h2>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cd-client">Client</Label>
          <Select id="cd-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1">
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cd-title">Title</Label>
          <Input id="cd-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. 2026 Test Certificate" />
        </div>
      </div>

      <div>
        <Label htmlFor="cd-label">Label (optional)</Label>
        <Input id="cd-label" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" placeholder="e.g. Certificate, Report, Contract" />
      </div>

      <div>
        <Label htmlFor="cd-description">Description (optional)</Label>
        <Textarea id="cd-description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
      </div>

      <div>
        <Label htmlFor="cd-file">PDF</Label>
        <Input id="cd-file" ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="mt-1" />
      </div>

      <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
        <Upload className="h-4 w-4" /> {isPending ? "Sending…" : "Send Document"}
      </Button>
    </div>
  )
}
