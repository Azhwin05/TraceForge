"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { advancedJobCardSchema, type AdvancedJobCardInput } from "@/lib/validations/job-card"
import { upsertJobCardAdvancedDetails } from "@/app/(app)/job-cards/traveller-actions"
import type { JobCard, UserRole } from "@/types/database"

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function FormField({ label, name, register }: { label: string; name: string; register: ReturnType<typeof useForm>["register"] }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input {...register(name)} />
    </div>
  )
}

export function AdvancedDetailsSection({
  jobCard,
  userRole,
}: {
  jobCard: JobCard
  userRole: UserRole
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const canEdit = ["admin", "engineer", "qa"].includes(userRole)

  const hasAny = !!(
    jobCard.product_group || jobCard.buyer || jobCard.material_code ||
    jobCard.valve_size_class || jobCard.valve_type_component ||
    jobCard.base_material || jobCard.overlay_material || jobCard.base_material_grade ||
    jobCard.regularization || jobCard.ring_heat_no || jobCard.mpi_rt_no
  )

  const { register, handleSubmit, reset } = useForm<AdvancedJobCardInput>({
    resolver: zodResolver(advancedJobCardSchema),
    defaultValues: {
      product_group:        jobCard.product_group ?? "",
      buyer:                jobCard.buyer ?? "",
      material_code:        jobCard.material_code ?? "",
      valve_size_class:     jobCard.valve_size_class ?? "",
      valve_type_component: jobCard.valve_type_component ?? "",
      base_material:        jobCard.base_material ?? "",
      overlay_material:     jobCard.overlay_material ?? "",
      base_material_grade:  jobCard.base_material_grade ?? "",
      regularization:       jobCard.regularization ?? "",
      ring_heat_no:         jobCard.ring_heat_no ?? "",
      mpi_rt_no:            jobCard.mpi_rt_no ?? "",
    },
  })

  function openEdit() {
    reset({
      product_group:        jobCard.product_group ?? "",
      buyer:                jobCard.buyer ?? "",
      material_code:        jobCard.material_code ?? "",
      valve_size_class:     jobCard.valve_size_class ?? "",
      valve_type_component: jobCard.valve_type_component ?? "",
      base_material:        jobCard.base_material ?? "",
      overlay_material:     jobCard.overlay_material ?? "",
      base_material_grade:  jobCard.base_material_grade ?? "",
      regularization:       jobCard.regularization ?? "",
      ring_heat_no:         jobCard.ring_heat_no ?? "",
      mpi_rt_no:            jobCard.mpi_rt_no ?? "",
    })
    setEditOpen(true)
  }

  function onSubmit(data: AdvancedJobCardInput) {
    startTransition(async () => {
      const result = await upsertJobCardAdvancedDetails(jobCard.id, data)
      if (result.error) {
        toast.error("Save failed", { description: result.error })
      } else {
        toast.success("Details saved")
        setEditOpen(false)
        router.refresh()
      }
    })
  }

  if (!hasAny && !canEdit) return null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Product / Material Details</CardTitle>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={openEdit}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              )}
              {hasAny && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded((e) => !e)}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {(hasAny || expanded) && (
          <CardContent className="space-y-2">
            {!hasAny && (
              <p className="text-sm text-muted-foreground">No advanced details yet. Click Edit to add.</p>
            )}
            {hasAny && (expanded ? (
              <>
                <Row label="Product Group"       value={jobCard.product_group} />
                <Row label="Buyer"               value={jobCard.buyer} />
                <Row label="Material Code"       value={jobCard.material_code} />
                <Row label="Valve Size & Class"  value={jobCard.valve_size_class} />
                <Row label="Valve Type / Comp."  value={jobCard.valve_type_component} />
                <Row label="Base Material"       value={jobCard.base_material} />
                <Row label="Overlay Material"    value={jobCard.overlay_material} />
                <Row label="Base Mat. Grade"     value={jobCard.base_material_grade} />
                <Row label="Regularization"      value={jobCard.regularization} />
                <Row label="Ring Heat No."       value={jobCard.ring_heat_no} />
                <Row label="MPI / RT No."        value={jobCard.mpi_rt_no} />
              </>
            ) : (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {jobCard.valve_size_class && <span className="text-muted-foreground">Size: <span className="text-foreground font-medium">{jobCard.valve_size_class}</span></span>}
                {jobCard.base_material && <span className="text-muted-foreground">Base: <span className="text-foreground font-medium">{jobCard.base_material}</span></span>}
                {jobCard.overlay_material && <span className="text-muted-foreground">Overlay: <span className="text-foreground font-medium">{jobCard.overlay_material}</span></span>}
                {jobCard.buyer && <span className="text-muted-foreground">Buyer: <span className="text-foreground font-medium">{jobCard.buyer}</span></span>}
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => !v && setEditOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product / Material Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Product Group"      name="product_group"        register={register} />
              <FormField label="Buyer"              name="buyer"                register={register} />
              <FormField label="Material Code"      name="material_code"        register={register} />
              <FormField label="Valve Size & Class" name="valve_size_class"     register={register} />
              <FormField label="Valve Type / Comp." name="valve_type_component" register={register} />
              <FormField label="Base Material"      name="base_material"        register={register} />
              <FormField label="Overlay Material"   name="overlay_material"     register={register} />
              <FormField label="Base Mat. Grade"    name="base_material_grade"  register={register} />
              <FormField label="Regularization"     name="regularization"       register={register} />
              <FormField label="Ring Heat No."      name="ring_heat_no"         register={register} />
              <FormField label="MPI / RT No."       name="mpi_rt_no"            register={register} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
