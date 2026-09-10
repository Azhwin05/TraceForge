"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, FileArchive, CheckCircle, Archive, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { markDossierSubmitted, archiveDossier, emailDossierToCustomer } from "@/app/(app)/dossiers/actions"
import type { DossierStatus, UserRole } from "@/types/database"

type Props = {
  dossierId: string
  dossierStatus: DossierStatus
  userRole: UserRole
  generatedIndexPath: string | null
  generatedZipPath: string | null
  emailSentTo?: string | null
  emailSentAt?: string | null
}

export function DossierStatusActions({
  dossierId,
  dossierStatus,
  userRole,
  generatedIndexPath,
  generatedZipPath,
  emailSentTo,
  emailSentAt,
}: Props) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [submittedBy, setSubmittedBy] = useState("")
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const canGenerate = ["admin", "qa"].includes(userRole) && dossierStatus !== "submitted" && dossierStatus !== "archived"
  const canSubmit   = ["admin", "qa"].includes(userRole) && dossierStatus === "generated"
  const canArchive  = userRole === "admin" && dossierStatus !== "submitted"
  const canEmail    = ["admin", "qa"].includes(userRole) &&
    ["generated", "submitted"].includes(dossierStatus) &&
    (generatedIndexPath !== null || generatedZipPath !== null)

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

  function handleEmail() {
    if (!emailTo.trim()) { toast.error("Enter the recipient's email address"); return }
    startTransition(async () => {
      const result = await emailDossierToCustomer({
        dossierId,
        to: emailTo.trim(),
        message: emailMessage.trim() || undefined,
      })
      if (result.error) { toast.error(result.error) }
      else {
        toast.success(`Document package emailed to ${result.sentTo}`)
        setShowEmailForm(false)
        setEmailTo("")
        setEmailMessage("")
        router.refresh()
      }
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

      {/* Email to customer (automated documentation) */}
      {canEmail && (
        <div>
          {!showEmailForm ? (
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                className="border-info-border/40 text-info hover:bg-info-surface w-full sm:w-auto"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Email to Customer
              </Button>
              {emailSentTo && emailSentAt && (
                <p className="text-xs text-muted-foreground">
                  Last sent to {emailSentTo} on {new Date(emailSentAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-info-border bg-info-surface p-3 space-y-2">
              <p className="text-xs font-medium text-info">Email document package</p>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="customer@example.com"
                className="w-full h-7 rounded border border-input bg-background px-2 text-sm"
              />
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Optional message to include…"
                rows={2}
                className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEmail} disabled={isPending}>
                  {isPending ? "Sending…" : "Send"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowEmailForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      {canSubmit && (
        <div>
          {!showSubmitForm ? (
            <Button
              variant="outline"
              size="sm"
              className="border-success-border/40 text-success hover:bg-success-surface w-full sm:w-auto"
              onClick={() => setShowSubmitForm(true)}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark Submitted to Customer
            </Button>
          ) : (
            <div className="rounded-md border border-success-border bg-success-surface p-3 space-y-2">
              <p className="text-xs font-medium text-success">Confirm submission</p>
              <input
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="Submitted by (name)"
                className="w-full h-7 rounded border border-input bg-background px-2 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={handleSubmit} disabled={isPending}>
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
