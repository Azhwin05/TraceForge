"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, XCircle, Upload, Link2, Unlink, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { DocumentCard } from "@/components/documents/document-card"
import { FileUpload } from "@/components/documents/file-upload"
import { createWpsSchema, type CreateWpsInput } from "@/lib/validations/job-card"
import { submitWps, approveWps, rejectWps } from "@/app/(app)/job-cards/actions"
import { linkWpsMaster, unlinkWpsMaster, linkWpsMasterByCode } from "@/app/(app)/job-cards/traveller-actions"
import type { WpsQualificationWithMaster, WpsMasterSummary, JobCardStatus, UserRole } from "@/types/database"

function WpsMasterPanel({ master }: { master: WpsMasterSummary }) {
  const ep = master.electrical_params_json as Record<string, unknown> | null
  return (
    <div className="rounded bg-muted/50 px-3 py-2 text-xs space-y-1.5 mt-2">
      <div className="flex items-center gap-2">
        <span className="font-medium">WPS Master: {master.wps_no}</span>
        {master.revision && <span className="text-muted-foreground">Rev. {master.revision}</span>}
        {master.pqr_no && <span className="text-muted-foreground">PQR: {master.pqr_no}</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-muted-foreground sm:grid-cols-3">
        {master.welding_process && <span>Process: {master.welding_process}</span>}
        {master.filler_material && <span>Filler: {master.filler_material}</span>}
        {master.filler_aws_class && <span>AWS: {master.filler_aws_class}</span>}
        {master.filler_size && <span>Size: {master.filler_size}mm</span>}
        {master.preheat_min != null && <span>Pre-heat min: {master.preheat_min}°C</span>}
        {master.interpass_max != null && <span>Inter-pass max: {master.interpass_max}°C</span>}
        {master.pwht_required != null && (
          <span>PWHT: {master.pwht_required ? `Required (${master.pwht_temp_min ?? "?"}–${master.pwht_temp_max ?? "?"}°C)` : "Not required"}</span>
        )}
        {ep && typeof ep === "object" && Object.keys(ep).length > 0 && (
          <span>Elec. params on file</span>
        )}
      </div>
    </div>
  )
}

function LinkMasterForm({
  qualificationId,
  jobCardId,
  masters,
  currentMasterId,
  onDone,
}: {
  qualificationId: string
  jobCardId: string
  masters: WpsMasterSummary[]
  currentMasterId: string | null
  onDone: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(currentMasterId ?? "")

  function handleLink() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await linkWpsMaster(qualificationId, jobCardId, { wps_master_id: selectedId })
      if (result.error) {
        toast.error("Link failed", { description: result.error })
      } else {
        toast.success("WPS Master linked")
        onDone()
        router.refresh()
      }
    })
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkWpsMaster(qualificationId, jobCardId)
      if (result.error) {
        toast.error("Unlink failed", { description: result.error })
      } else {
        toast.success("WPS Master unlinked")
        onDone()
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded border border-dashed border-border p-3 space-y-2 mt-2">
      <p className="text-xs font-medium text-muted-foreground">Link Approved WPS Master</p>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">— Select approved master —</option>
            {masters.filter((m) => m.status === "approved").map((m) => (
              <option key={m.id} value={m.id}>
                {m.wps_no} Rev.{m.revision} {m.welding_process ? `— ${m.welding_process}` : ""}
              </option>
            ))}
          </select>
        </div>
        <Button size="xs" disabled={isPending || !selectedId} onClick={handleLink}>
          <Link2 className="h-3 w-3 mr-1" /> Link
        </Button>
        {currentMasterId && (
          <Button size="xs" variant="outline" disabled={isPending} onClick={handleUnlink}>
            <Unlink className="h-3 w-3 mr-1" /> Unlink
          </Button>
        )}
      </div>
    </div>
  )
}

// "Enter WPS Number" shortcut — looks up the approved WPS Master by number,
// generates its PDF fresh, and attaches both the link and the PDF in one step.
function LinkMasterByCodeForm({
  qualificationId,
  jobCardId,
  onDone,
}: {
  qualificationId: string
  jobCardId: string
  onDone: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [wpsNo, setWpsNo] = useState("")

  function handleFetch() {
    if (!wpsNo.trim()) return
    startTransition(async () => {
      const result = await linkWpsMasterByCode(qualificationId, jobCardId, { wps_no: wpsNo })
      if (result.error) {
        toast.error("Could not attach WPS", { description: result.error })
      } else {
        toast.success(`WPS ${result.wpsNo} Rev. ${result.revision} attached`, {
          description: "The complete filled WPS PDF has been generated and linked.",
        })
        setWpsNo("")
        onDone()
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded border border-dashed border-border p-3 space-y-2 mt-2">
      <p className="text-xs font-medium text-muted-foreground">Enter WPS Number — auto-attach complete filled WPS</p>
      <div className="flex gap-2 items-end">
        <Input
          placeholder="WPS/RE/301"
          value={wpsNo}
          onChange={(e) => setWpsNo(e.target.value)}
          className="h-8 text-xs flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetch() } }}
        />
        <Button size="xs" disabled={isPending || !wpsNo.trim()} onClick={handleFetch}>
          <Sparkles className="h-3 w-3 mr-1" /> {isPending ? "Fetching…" : "Fetch & Attach"}
        </Button>
      </div>
    </div>
  )
}

export function WpsSection({
  jobCardId,
  status,
  userRole,
  wpsRecords,
  wpsMasters = [],
}: {
  jobCardId: string
  status: JobCardStatus
  userRole: UserRole
  wpsRecords: WpsQualificationWithMaster[]
  wpsMasters?: WpsMasterSummary[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [linkOpenFor, setLinkOpenFor] = useState<string | null>(null)

  const canUpload = ["admin", "qa"].includes(userRole) && status === "wps_pending"
  const canApprove = ["admin", "qa"].includes(userRole) && status === "wps_uploaded"
  const canLinkMaster = ["admin", "qa"].includes(userRole)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWpsInput>({ resolver: zodResolver(createWpsSchema) })

  function onSubmitWps(data: CreateWpsInput) {
    startTransition(async () => {
      const result = await submitWps(jobCardId, data)
      if (result.error) {
        toast.error("Failed to submit WPS", { description: result.error })
      } else {
        toast.success("WPS submitted for approval")
        reset()
        router.refresh()
      }
    })
  }

  function handleApprove(wpsId: string) {
    startTransition(async () => {
      const result = await approveWps(wpsId, jobCardId)
      if (result.error) {
        toast.error("Approval failed", { description: result.error })
      } else {
        toast.success("WPS approved")
        router.refresh()
      }
    })
  }

  function openReject(wpsId: string) {
    setRejectingId(wpsId)
    setRejectReason("")
    setRejectOpen(true)
  }

  function handleReject() {
    if (!rejectingId || !rejectReason.trim()) return
    startTransition(async () => {
      const result = await rejectWps(rejectingId, jobCardId, rejectReason)
      if (result.error) {
        toast.error("Rejection failed", { description: result.error })
      } else {
        toast.success("WPS rejected — job returned to WPS Pending")
        setRejectOpen(false)
        router.refresh()
      }
    })
  }

  if (!["wps_pending", "wps_uploaded", "wps_approved", "process_assigned", "in_process", "process_complete", "reports_pending", "reports_complete", "dispatch_ready", "dispatched", "accounts_processing", "closed"].includes(status)) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> WPS Qualification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {wpsRecords.length > 0 && (
            <div className="space-y-4">
              {wpsRecords.map((wps) => (
                <div key={wps.id} className="rounded-lg border border-border p-3 text-sm space-y-2">
                  {/* Header: WPS number + status badge / action buttons */}
                  <div className="flex items-start justify-between">
                    <p className="font-medium">
                      {wps.wps_number}{" "}
                      <span className="font-normal text-muted-foreground">Rev. {wps.revision ?? "—"}</span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {wps.approval_status === "approved" && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="h-3.5 w-3.5" /> Approved
                        </span>
                      )}
                      {wps.approval_status === "rejected" && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> Rejected
                        </span>
                      )}
                      {wps.approval_status === "pending" && canApprove && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(wps.id)} disabled={isPending}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openReject(wps.id)} disabled={isPending}>
                            Reject
                          </Button>
                        </>
                      )}
                      {wps.approval_status === "pending" && !canApprove && (
                        <span className="text-xs text-muted-foreground">Awaiting approval</span>
                      )}
                    </div>
                  </div>

                  {wps.rejection_reason && (
                    <p className="text-xs text-destructive">Rejected: {wps.rejection_reason}</p>
                  )}

                  {/* WPS Master panel — shows master parameters if linked, else fallback to free-text */}
                  {wps.wps_master ? (
                    <WpsMasterPanel master={wps.wps_master as WpsMasterSummary} />
                  ) : (
                    wps.wps_master_id == null && !canLinkMaster && (
                      <p className="text-xs text-muted-foreground">No WPS Master linked.</p>
                    )
                  )}

                  {/* Link / unlink master — admin or QA only */}
                  {canLinkMaster && (
                    <>
                      {linkOpenFor === wps.id ? (
                        <>
                          <LinkMasterByCodeForm
                            qualificationId={wps.id}
                            jobCardId={jobCardId}
                            onDone={() => setLinkOpenFor(null)}
                          />
                          {wpsMasters.length > 0 && (
                            <LinkMasterForm
                              qualificationId={wps.id}
                              jobCardId={jobCardId}
                              masters={wpsMasters}
                              currentMasterId={wps.wps_master_id}
                              onDone={() => setLinkOpenFor(null)}
                            />
                          )}
                        </>
                      ) : (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-xs text-muted-foreground"
                          onClick={() => setLinkOpenFor(wps.id)}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          {wps.wps_master_id ? "Change Master" : "Link WPS Master"}
                        </Button>
                      )}
                    </>
                  )}

                  {/* Document display */}
                  <DocumentCard
                    storagePath={wps.storage_path}
                    legacyDocUrl={wps.doc_url}
                    compact
                  />

                  <FileUpload
                    entityType="wps_qualification"
                    entityId={wps.id}
                    documentType="wps_pdf"
                    userRole={userRole}
                    jobCardId={jobCardId}
                    sourceModule="wps_section"
                    label={wps.storage_path ? "Replace Document" : "Upload WPS PDF"}
                  />
                </div>
              ))}
            </div>
          )}

          {wpsRecords.length === 0 && !canUpload && (
            <p className="text-sm text-muted-foreground">No WPS records yet.</p>
          )}

          {canUpload && (
            <form onSubmit={handleSubmit(onSubmitWps)} className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">Submit WPS Document</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="wps_number">WPS Number</Label>
                  <Input id="wps_number" placeholder="WPS-001" {...register("wps_number")} aria-invalid={!!errors.wps_number} />
                  {errors.wps_number && <p className="text-xs text-destructive">{errors.wps_number.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="revision">Revision</Label>
                  <Input id="revision" placeholder="Rev A" {...register("revision")} aria-invalid={!!errors.revision} />
                  {errors.revision && <p className="text-xs text-destructive">{errors.revision.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc_url">Document URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="doc_url" type="url" placeholder="https://..." {...register("doc_url")} />
              </div>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit WPS"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject WPS</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject_reason">Reason for rejection</Label>
            <Textarea
              id="reject_reason"
              placeholder="Describe what needs to be corrected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending || !rejectReason.trim()}>
              {isPending ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
