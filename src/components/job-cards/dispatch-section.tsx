"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Truck, ShieldCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentCard } from "@/components/documents/document-card"
import { FileUpload } from "@/components/documents/file-upload"
import { dispatchSchema, type DispatchInput } from "@/lib/validations/process-execution"
import { createDispatch, validateDispatch } from "@/app/(app)/job-cards/detail-actions"
import type { Dispatch, JobCardStatus, UserRole } from "@/types/database"

export function DispatchSection({
  jobCardId,
  jcNumber,
  status,
  userRole,
  dispatches,
  validatedAt,
  validatedByName,
}: {
  jobCardId: string
  jcNumber: string
  status: JobCardStatus
  userRole: UserRole
  dispatches: Dispatch[]
  validatedAt?: string | null
  validatedByName?: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isValidated = !!validatedAt
  const canValidate = ["admin", "qa"].includes(userRole) && status === "dispatch_ready"
  const canDispatch = ["admin"].includes(userRole) && status === "dispatch_ready" && isValidated
  const hasDispatched = dispatches.length > 0

  function handleValidate(next: boolean) {
    startTransition(async () => {
      const result = await validateDispatch(jobCardId, next)
      if (result.error) {
        toast.error("Validation failed", { description: result.error })
      } else {
        toast.success(next ? "Product verified — Ready to Dispatch" : "Validation cleared")
        router.refresh()
      }
    })
  }

  const { register, handleSubmit, formState: { errors } } = useForm<DispatchInput>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: { dispatch_date: new Date().toISOString().split("T")[0] },
  })

  function onSubmit(data: DispatchInput) {
    startTransition(async () => {
      const result = await createDispatch(jobCardId, data)
      if (result.error) {
        toast.error("Dispatch failed", { description: result.error })
      } else {
        toast.success("Job dispatched successfully")
        router.refresh()
      }
    })
  }

  const activeStatuses: JobCardStatus[] = [
    "dispatch_ready", "dispatched", "accounts_processing", "closed",
  ]
  if (!activeStatuses.includes(status) && !hasDispatched) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" /> Dispatch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Physical validation gate — Admin/QA verify the product in real life */}
        {status === "dispatch_ready" && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            {isValidated ? (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
                <div>
                  <p className="font-medium text-success">
                    Ready to Dispatch — physically verified
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {validatedByName ? `By ${validatedByName}` : "Verified"}
                    {validatedAt && ` · ${new Date(validatedAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}`}
                  </p>
                  {canValidate && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="mt-1 h-6 px-1 text-xs text-muted-foreground"
                      disabled={isPending}
                      onClick={() => handleValidate(false)}
                    >
                      Undo validation
                    </Button>
                  )}
                </div>
              </div>
            ) : canValidate ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-muted-foreground">
                    Physically inspect the finished product, then mark it ready to dispatch.
                  </p>
                </div>
                <Button size="sm" disabled={isPending} onClick={() => handleValidate(true)}>
                  {isPending ? "Saving..." : "Mark Ready to Dispatch"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Awaiting physical verification by Admin or QA before dispatch.
              </p>
            )}
          </div>
        )}

        {hasDispatched && (
          <div className="space-y-2">
            {dispatches.map((d) => (
              <div key={d.id} className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">DC #{d.dc_number}</span>
                  <span className="text-muted-foreground">
                    {new Date(d.dispatch_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
                {d.vehicle_details && (
                  <p className="text-muted-foreground">Vehicle: {d.vehicle_details}</p>
                )}
                {(d.driver_name || d.driver_phone) && (
                  <p className="text-muted-foreground">
                    Driver: {[d.driver_name, d.driver_phone].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(d.transporter_name || d.lr_number) && (
                  <p className="text-muted-foreground">
                    {[d.transporter_name, d.lr_number && `LR ${d.lr_number}`].filter(Boolean).join(" · ")}
                  </p>
                )}
                {d.remarks && <p className="text-muted-foreground">{d.remarks}</p>}
                <DocumentCard
                  storagePath={d.storage_path}
                  legacyDocUrl={d.doc_url}
                  compact
                />
                <FileUpload
                  entityType="dispatch"
                  entityId={d.id}
                  documentType="dispatch_doc"
                  userRole={userRole}
                  jobCardId={jobCardId}
                  sourceModule="dispatch_section"
                  label={d.storage_path ? "Replace Document" : "Upload Dispatch Doc"}
                />
              </div>
            ))}
          </div>
        )}

        {canDispatch && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">Create Dispatch Record</p>

            {/* Job card is known from context — shown read-only, auto-linked. */}
            <div className="space-y-1">
              <Label>Job Card</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                {jcNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dc_number">DC Number *</Label>
                <Input
                  id="dc_number"
                  placeholder="DC-2024-001"
                  {...register("dc_number")}
                  aria-invalid={!!errors.dc_number}
                />
                {errors.dc_number && (
                  <p className="text-xs text-destructive">{errors.dc_number.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="dispatch_date">Dispatch Date *</Label>
                <Input
                  id="dispatch_date"
                  type="date"
                  {...register("dispatch_date")}
                  aria-invalid={!!errors.dispatch_date}
                />
                {errors.dispatch_date && (
                  <p className="text-xs text-destructive">{errors.dispatch_date.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="vehicle_details">Vehicle Number *</Label>
              <Input
                id="vehicle_details"
                placeholder="e.g. TN 01 AB 1234"
                {...register("vehicle_details")}
                aria-invalid={!!errors.vehicle_details}
              />
              {errors.vehicle_details && (
                <p className="text-xs text-destructive">{errors.vehicle_details.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="driver_name">Driver Name</Label>
                <Input id="driver_name" placeholder="e.g. Suresh" {...register("driver_name")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="driver_phone">Driver Phone</Label>
                <Input id="driver_phone" placeholder="e.g. 98765 43210" {...register("driver_phone")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transporter_name">Transporter</Label>
                <Input id="transporter_name" placeholder="Transporter / carrier" {...register("transporter_name")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lr_number">LR Number</Label>
                <Input id="lr_number" placeholder="Lorry receipt no." {...register("lr_number")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc_url">Document URL</Label>
              <Input
                id="doc_url"
                type="url"
                placeholder="https://..."
                {...register("doc_url")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Any dispatch notes..."
                className="min-h-[80px]"
                {...register("remarks")}
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Dispatching..." : "Confirm Dispatch"}
            </Button>
          </form>
        )}

        {!hasDispatched && !canDispatch && status !== "dispatch_ready" && (
          <p className="text-sm text-muted-foreground">Dispatch details will appear here.</p>
        )}
      </CardContent>
    </Card>
  )
}
