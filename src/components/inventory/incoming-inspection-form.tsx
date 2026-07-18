"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { incomingInspectionSchema, type IncomingInspectionInput } from "@/lib/validations/material-inward"
import { submitIncomingInspection } from "@/app/(app)/inventory/material-inward/actions"

export function IncomingInspectionForm({ materialInwardId }: { materialInwardId: string }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register, handleSubmit,
    formState: { isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(incomingInspectionSchema),
    defaultValues: { quantity_ok: true, packaging_ok: true, documents_ok: true },
  })

  async function onSubmit(data: IncomingInspectionInput) {
    setServerError(null)
    const result = await submitIncomingInspection(materialInwardId, data)
    if (result.error) { setServerError(result.error); return }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input type="checkbox" {...register("quantity_ok")} className="h-4 w-4" />
          Quantity matches DC
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input type="checkbox" {...register("packaging_ok")} className="h-4 w-4" />
          Packaging condition OK
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input type="checkbox" {...register("documents_ok")} className="h-4 w-4" />
          Supporting documents OK
        </label>
      </div>
      <div>
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" {...register("remarks")} className="mt-1" rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Submit Incoming Inspection"}
      </Button>
    </form>
  )
}
