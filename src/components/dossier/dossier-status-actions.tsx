"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, FileArchive, CheckCircle, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { markDossierSubmitted, archiveDossier } from "@/app/(app)/dossiers/actions"
import type { DossierStatus, UserRole } from "@/types/database"

type Props = {
  dossierId: string
  dossierStatus: DossierStatus
  userRole: UserRole
  generatedIndexPath: string | null
  generatedZipPath: string | null
}

export function DossierStatusActions({
  dossierId,
  dossierStatus,
  userRole,
  generatedIndexPath,
  generatedZipPath,
}: Props) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [submittedBy, setSubmittedBy] = useState("")
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canGenerate = ["admin", "qa"].includes(userRole) && dossierStatus !== "submitted" && dossierStatus !== "archived"
  const canSubmit   = ["admin", "qa"].includes(userRole) && dossierStatus === "generated"
  const canArchive  = userRole === "admin" && dossierStatus !== "submitted"

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/dossiers/${dossierId}/generate`, { method: "POST" })
      const json = await res.json()
      if (!res.ok || json.error) {
        setGenerateError(json.error ?? "Generation failed")
        toast.error(json.error ?? "Generation failed")
      } else {
        if (json.warning) toast.warning(json.warning)
        else toast.success("Dossier generated successfully")
        router.refresh()
      }
    } catch {
      setGenerateError("Network error")
      toast.error("Network error")
    } finally {
      setIsGenerating(false)
    }
  }

  async function openFile(type: "index" | "zip") {
    try {
      const res = await fetch(`/api/dossiers/${dossierId}/generate-url?type=${type}`)
      const { url, error } = await res.json()
      if (error || !url) { toast.error(error ?? "Could not get download link"); return }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Network error")
    }
  }

  function handleSubmit() {
    if (!submittedBy.trim()) { toast.error("Enter submitted-by name"); return }
    startTransition(async () => {
      const result = await markDossierSubmitted(dossierId, submittedBy)
      if (result.error) { toast.error(result.error) }
      else { toast.success("Dossier marked as submitted"); router.refresh() }
    })
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveDossier(dossierId)
      if (result.error) { toast.error(result.error) }
      else { toast.success("Dossier archived"); router.refresh() }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Generate */}
      {canGenerate && (
        <div className="space-y-1">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating…</>
            ) : (
              <><FileArchive className="mr-1.5 h-3.5 w-3.5" /> {dossierStatus === "generated" ? "Regenerate Dossier" : "Generate Dossier"}</>
            )}
          </Button>
          {generateError && <p className="text-xs text-destructive">{generateError}</p>}
        </div>
      )}

      {/* Download Index PDF */}
      {generatedIndexPath && (
        <Button variant="outline" size="sm" onClick={() => openFile("index")} className="w-full sm:w-auto">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download Index PDF
        </Button>
      )}

      {/* Download ZIP */}
      {generatedZipPath && (
        <Button variant="outline" size="sm" onClick={() => openFile("zip")} className="w-full sm:w-auto">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download ZIP Pack
        </Button>
      )}

      {/* Submit */}
      {canSubmit && (
        <div>
          {!showSubmitForm ? (
            <Button
              variant="outline"
              size="sm"
              className="border-green-500/40 text-green-700 hover:bg-green-50 w-full sm:w-auto"
              onClick={() => setShowSubmitForm(true)}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark Submitted to Customer
            </Button>
          ) : (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-2">
              <p className="text-xs font-medium text-green-800">Confirm submission</p>
              <input
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="Submitted by (name)"
                className="w-full h-7 rounded border border-input bg-background px-2 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-700 hover:bg-green-800" onClick={handleSubmit} disabled={isPending}>
                  {isPending ? "Saving…" : "Confirm Submitted"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSubmitForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archive */}
      {canArchive && (
        <div>
          {!showArchiveConfirm ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto"
              onClick={() => setShowArchiveConfirm(true)}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive Dossier
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">Archive this dossier?</span>
              <Button size="sm" variant="destructive" onClick={handleArchive} disabled={isPending}>
                {isPending ? "…" : "Confirm"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
