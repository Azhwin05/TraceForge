"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, CheckCircle, XCircle, Send, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  approvePmiReport,
  rejectPmiReport,
  markSubmittedToCustomer,
} from "@/app/(app)/pmi-reports/actions"
import type { UserRole } from "@/types/database"

interface Props {
  reportId: string
  pmiStatus: "draft" | "approved" | "rejected" | "submitted"
  userRole: UserRole
  generatedPdfPath: string | null
  reportNumber: string | null
}

export function PmiStatusActions({
  reportId,
  pmiStatus,
  userRole,
  generatedPdfPath,
}: Props) {
  const router = useRouter()
  const [approvedByName, setApprovedByName] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [submittedByName, setSubmittedByName] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const isAdminOrQa = ["admin", "qa"].includes(userRole)

  async function handleGeneratePdf() {
    setLoading("generate")
    try {
      const resp = await fetch(`/api/pmi-reports/${reportId}/generate`, { method: "POST" })
      const data = await resp.json()
      if (!resp.ok || data.error) {
        toast.error(data.error ?? "PDF generation failed")
      } else {
        setDownloadUrl(data.downloadUrl)
        toast.success("PDF generated successfully")
        router.refresh()
      }
    } catch {
      toast.error("Network error generating PDF")
    } finally {
      setLoading(null)
    }
  }

  async function handleApprove() {
    setLoading("approve")
    const result = await approvePmiReport(reportId, approvedByName)
    setLoading(null)
    if (result.error) { toast.error(result.error); return }
    toast.success("PMI Report approved")
    router.refresh()
  }

  async function handleReject() {
    if (!rejectionReason.trim()) { toast.error("Rejection reason is required"); return }
    setLoading("reject")
    const result = await rejectPmiReport(reportId, rejectionReason)
    setLoading(null)
    if (result.error) { toast.error(result.error); return }
    toast.success("PMI Report rejected")
    setShowRejectForm(false)
    router.refresh()
  }

  async function handleSubmit() {
    setLoading("submit")
    const result = await markSubmittedToCustomer(reportId, submittedByName)
    setLoading(null)
    if (result.error) { toast.error(result.error); return }
    toast.success("Marked as submitted to customer")
    setShowSubmitForm(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Generate PDF */}
      {isAdminOrQa && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePdf}
            disabled={loading === "generate"}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", loading === "generate" && "animate-spin")} />
            {generatedPdfPath ? "Re-generate PDF" : "Generate PDF"}
          </Button>

          {(downloadUrl ?? generatedPdfPath) && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (downloadUrl) {
                  window.open(downloadUrl, "_blank")
                } else if (generatedPdfPath) {
                  // fetch signed URL on demand
                  const resp = await fetch(`/api/pmi-reports/${reportId}/generate-url`)
                  const data = await resp.json()
                  if (data.url) window.open(data.url, "_blank")
                }
              }}
            >
              <Download className="mr-1.5 h-4 w-4" /> Download PDF
            </Button>
          )}
        </div>
      )}

      {/* Approve */}
      {isAdminOrQa && pmiStatus === "draft" && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold">Approve Report</h3>
          <div>
            <Label htmlFor="approvedBy">Approved By (name)</Label>
            <Input
              id="approvedBy"
              value={approvedByName}
              onChange={(e) => setApprovedByName(e.target.value)}
              placeholder="Inspector name"
              className="mt-1 max-w-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={loading === "approve"}
          >
            <CheckCircle className="mr-1.5 h-4 w-4" />
            {loading === "approve" ? "Approving…" : "Approve"}
          </Button>
        </div>
      )}

      {/* Reject */}
      {isAdminOrQa && (pmiStatus === "draft" || pmiStatus === "approved") && (
        <>
          {!showRejectForm ? (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowRejectForm(true)}
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Reject
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-destructive">Reject Report</h3>
              <div>
                <Label htmlFor="rejectionReason">Reason <span className="text-destructive">*</span></Label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                  placeholder="State reason for rejection"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleReject} disabled={loading === "reject"}>
                  {loading === "reject" ? "Rejecting…" : "Confirm Reject"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mark Submitted to Customer */}
      {isAdminOrQa && pmiStatus === "approved" && (
        <>
          {!showSubmitForm ? (
            <Button size="sm" onClick={() => setShowSubmitForm(true)}>
              <Send className="mr-1.5 h-4 w-4" /> Mark Submitted to Customer
            </Button>
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Mark Submitted</h3>
              <div>
                <Label htmlFor="submittedBy">Submitted By</Label>
                <Input
                  id="submittedBy"
                  value={submittedByName}
                  onChange={(e) => setSubmittedByName(e.target.value)}
                  className="mt-1 max-w-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={loading === "submit"}>
                  {loading === "submit" ? "Saving…" : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSubmitForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
