"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileText, CheckSquare, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { createDossier } from "@/app/(app)/dossiers/actions"
import { dossierSchema, type DossierInput } from "@/lib/validations/dossier"
import { cn } from "@/lib/utils"
import type { DocumentType } from "@/types/database"

// ── Default selection — these doc types are pre-selected ──────────────────────
const DEFAULT_SELECTED_TYPES = new Set<string>([
  "overlay_welding_report",
  "pmi_report",
  "dimension_report",
  "pwht_chart",
  "wps_pdf",
  "dispatch_doc",
])

const DOC_TYPE_LABELS: Record<string, string> = {
  overlay_welding_report: "Overlay Welding Report",
  pmi_report:             "PMI Report",
  dimension_report:       "Dimension Report",
  pwht_chart:             "PWHT Chart",
  wps_pdf:                "WPS PDF",
  pqr_pdf:                "PQR PDF",
  dispatch_doc:           "Dispatch Document",
  customer_drawing:       "Customer Drawing",
  calibration_cert:       "Calibration Certificate",
  customer_po:            "Customer PO",
  invoice:                "Invoice",
  annotated_drawing:      "Annotated Drawing",
  job_card_pdf:           "Job Card PDF",
  other:                  "Other",
}

export type DossierDocOption = {
  id: string
  document_name: string | null
  file_name: string
  document_type: DocumentType
  document_category: "uploaded" | "generated"
  source_module: string | null
  version: number
  approval_status: string
  uploaded_at: string
}

type Props = {
  jobCardId: string
  jobCardNumber: string
  defaultValues: Partial<DossierInput>
  documents: DossierDocOption[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function DossierForm({ jobCardId, jobCardNumber, defaultValues, documents }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Default-select docs of DEFAULT_SELECTED_TYPES
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(documents.filter((d) => DEFAULT_SELECTED_TYPES.has(d.document_type)).map((d) => d.id))
  )

  const form = useForm<DossierInput>({
    resolver: zodResolver(dossierSchema),
    defaultValues: {
      dossier_number: defaultValues.dossier_number ?? `DOS-${jobCardNumber}`,
      dossier_date:   defaultValues.dossier_date ?? new Date().toISOString().slice(0, 10),
      customer_name:  defaultValues.customer_name ?? null,
      po_number:      defaultValues.po_number ?? null,
      nbdn_number:    defaultValues.nbdn_number ?? null,
      drawing_number: defaultValues.drawing_number ?? null,
      heat_number:    defaultValues.heat_number ?? null,
      prepared_by:    defaultValues.prepared_by ?? null,
      approved_by:    defaultValues.approved_by ?? null,
      remarks:        defaultValues.remarks ?? null,
      document_ids:   [],
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  function toggleDoc(docId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)))
    }
  }

  async function onSubmit(values: DossierInput) {
    const docIds = Array.from(selectedIds)
    if (docIds.length === 0) {
      toast.error("Select at least one document")
      return
    }
    startTransition(async () => {
      const result = await createDossier(jobCardId, { ...values, document_ids: docIds })
      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        toast.success("Dossier created")
        router.push(`/dossiers/${result.data.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Dossier Metadata ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dossier Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Dossier number */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dossier Number <span className="text-destructive">*</span>
            </label>
            <input
              {...register("dossier_number")}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            {errors.dossier_number && (
              <p className="text-xs text-destructive">{errors.dossier_number.message}</p>
            )}
          </div>

          {/* Dossier date */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dossier Date <span className="text-destructive">*</span>
            </label>
            <input
              {...register("dossier_date")}
              type="date"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            {errors.dossier_date && (
              <p className="text-xs text-destructive">{errors.dossier_date.message}</p>
            )}
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Name</label>
            <input {...register("customer_name")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* PO number */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PO Number</label>
            <input {...register("po_number")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* NBDN */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NBDN Number</label>
            <input {...register("nbdn_number")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* Drawing */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drawing Number</label>
            <input {...register("drawing_number")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* Heat */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Heat Number</label>
            <input {...register("heat_number")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* Prepared by */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prepared By</label>
            <input {...register("prepared_by")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* Approved by */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved By</label>
            <input {...register("approved_by")} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          {/* Remarks */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Remarks</label>
            <textarea
              {...register("remarks")}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Document Selection ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Select Documents</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} of {documents.length} selected
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {selectedIds.size === documents.length ? "Deselect all" : "Select all"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No documents found for this job card.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const selected = selectedIds.has(doc.id)
                const typeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDoc(doc.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    )}
                  >
                    {selected
                      ? <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                      : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.document_name ?? doc.file_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          doc.document_category === "generated"
                            ? "bg-info-surface text-info"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {typeLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">v{doc.version}</span>
                        {doc.source_module && (
                          <span className="text-xs text-muted-foreground">{doc.source_module}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{fmtDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                    {DEFAULT_SELECTED_TYPES.has(doc.document_type) && (
                      <span className="shrink-0 text-[10px] font-medium text-success bg-success-surface rounded-full px-1.5 py-0.5">
                        Recommended
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {selectedIds.size === 0 && (
            <p className="mt-2 text-xs text-destructive">Select at least one document</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending || selectedIds.size === 0}>
          {isPending ? "Creating…" : "Create Dossier"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
