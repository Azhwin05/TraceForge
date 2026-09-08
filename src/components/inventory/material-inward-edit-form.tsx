"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { materialInwardEditSchema, type MaterialInwardEditInput } from "@/lib/validations/material-inward"
import { updateMaterialInward } from "@/app/(app)/inventory/material-inward/actions"
import type { MaterialInward } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

type JobCardOption = { id: string; jc_number: string }

export function MaterialInwardEditForm({
  record, sourceLabel, jobCards,
}: {
  record: MaterialInward
  /** Resolved supplier or client name — display only. Source is not editable
   *  here; see the doc comment on updateMaterialInward. */
  sourceLabel: string
  jobCards: JobCardOption[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(materialInwardEditSchema),
    defaultValues: {
      dc_number:   record.dc_number,
      dc_date:     record.dc_date.slice(0, 10),
      job_card_id: record.job_card_id ?? "",
      po_number:   record.po_number ?? "",
      vehicle_no:  record.vehicle_no ?? "",
      remarks:     record.remarks ?? "",
    },
  })

  async function onSubmit(data: MaterialInwardEditInput) {
    setServerError(null)
    const result = await updateMaterialInward(record.id, data)
    if (result.error) { setServerError(result.error); return }
    router.push(`/inventory/material-inward/${record.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Delivery Challan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="dc_number">DC Number <span className="text-destructive">*</span></Label>
            <Input id="dc_number" {...register("dc_number")} className="mt-1" />
            <FieldError message={errors.dc_number?.message} />
          </div>
          <div>
            <Label htmlFor="dc_date">DC Date <span className="text-destructive">*</span></Label>
            <Input id="dc_date" type="date" {...register("dc_date")} className="mt-1" />
            <FieldError message={errors.dc_date?.message} />
          </div>
          <div>
            <Label>Source</Label>
            <p className="mt-1 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
              {sourceLabel} ({record.source_type === "customer" ? "client-supplied" : "supplier"})
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="po_number">PO Number</Label>
            <Input id="po_number" {...register("po_number")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="vehicle_no">Vehicle No.</Label>
            <Input id="vehicle_no" {...register("vehicle_no")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="job_card_id">Job Card</Label>
            <Select id="job_card_id" {...register("job_card_id")} className="mt-1">
              <option value="">Not tied to a specific job</option>
              {jobCards.map((jc) => (
                <option key={jc.id} value={jc.id}>{jc.jc_number}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" {...register("remarks")} className="mt-1" rows={2} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Only the delivery-challan header can be edited here — the item list, inspections,
        and GRN follow their own workflow steps on the detail page.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
