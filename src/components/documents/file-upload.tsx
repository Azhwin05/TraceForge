"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, Loader2, FileText, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  buildStoragePath,
  validateFileClient,
  formatFileSize,
  STORAGE_BUCKET,
} from "@/lib/documents/storage-utils"
import { registerUploadedDocument } from "@/app/(app)/documents/actions"
import { Button } from "@/components/ui/button"
import type { DocumentEntityType, DocumentType, UserRole } from "@/types/database"

// Client-side role permission mirror (server also enforces this)
const UPLOAD_ROLES: Record<DocumentType, UserRole[]> = {
  wps_pdf:                ["admin", "qa", "engineer"],
  pqr_pdf:               ["admin", "qa", "engineer"],
  pmi_report:            ["admin", "qa"],
  dimension_report:      ["admin", "qa"],
  pwht_chart:            ["admin", "engineer", "qa"],
  dispatch_doc:          ["admin"],
  invoice:               ["admin", "accounts"],
  calibration_cert:      ["admin", "qa"],
  customer_po:           ["admin"],
  customer_drawing:      ["admin"],
  job_card_pdf:          ["admin"],
  overlay_welding_report: ["admin", "qa"],
  annotated_drawing:     ["admin", "qa"],
  other:                 ["admin", "qa", "engineer"],
  dossier_index:         ["admin"],
  dossier_zip:           ["admin"],
}

export type FileUploadProps = {
  entityType:   DocumentEntityType
  entityId:     string
  documentType: DocumentType
  userRole:     UserRole
  jobCardId?:   string | null
  sourceModule?: string
  disabled?:    boolean
  /** Button label. Defaults to "Upload File". */
  label?:       string
  onUploadComplete?: (storagePath: string) => void
  className?:   string
}

export function FileUpload({
  entityType,
  entityId,
  documentType,
  userRole,
  jobCardId,
  sourceModule,
  disabled,
  label = "Upload File",
  onUploadComplete,
  className,
}: FileUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const canUpload = UPLOAD_ROLES[documentType]?.includes(userRole) ?? false
  if (!canUpload) return null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setUploadError(null)
    setSelectedFile(null)
    if (!file) return

    const err = validateFileClient(file)
    if (err) {
      setUploadError(err)
      e.target.value = ""
      return
    }
    setSelectedFile(file)
  }

  function clearSelected() {
    setSelectedFile(null)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleUpload() {
    if (!selectedFile) return
    startTransition(async () => {
      setUploadError(null)
      const supabase = createClient()

      const storagePath = buildStoragePath(entityType, entityId, documentType, selectedFile.name)

      // Upload file directly to Supabase Storage from the browser.
      // This bypasses Vercel's 4.5 MB body limit — the file goes straight to
      // the Storage bucket using the user's authenticated session.
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        })

      if (storageError) {
        const msg = storageError.message ?? "Upload failed"
        toast.error("Upload failed", { description: msg })
        setUploadError(msg)
        return
      }

      // Register the uploaded file in the database (server action validates role)
      const result = await registerUploadedDocument({
        entityType,
        entityId,
        documentType,
        storagePath,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        jobCardId: jobCardId ?? null,
        sourceModule: sourceModule ?? null,
      })

      if (result.error) {
        // Clean up the orphaned storage object
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
        toast.error("Registration failed", { description: result.error })
        setUploadError(result.error)
        return
      }

      toast.success("Document uploaded", {
        description: `Version ${result.data?.version ?? 1} saved.`,
      })
      clearSelected()
      onUploadComplete?.(storagePath)
      router.refresh()
    })
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isPending}
      />

      {selectedFile ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded border border-border bg-muted/40 px-2.5 py-1.5 text-sm">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-[180px] truncate">{selectedFile.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({formatFileSize(selectedFile.size)})
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleUpload}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={clearSelected}
            aria-label="Cancel selection"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Button>
      )}

      {uploadError && (
        <p className="mt-1 text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  )
}
