"use client"

import { useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  dimensionReportSchema,
  blankDimensionRow,
  type DimensionReportInput,
} from "@/lib/validations/dimension-report"
import { createDimensionReport, updateDimensionReport } from "@/app/(app)/dimension-reports/actions"
import type { DimensionReport, InstrumentMaster, JobCard } from "@/types/database"

function Lbl({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs text-muted-foreground">{children}</Label>
}

function buildDefaults(
  report: DimensionReport | null,
  jobCard: JobCard | null,
): DimensionReportInput {
  if (report) {
    // Edit mode — populate from existing report
    const rawDims = report.dimensions
    const dims = Array.isArray(rawDims)
      ? (rawDims as DimensionReportInput["dimensions"])
      : [blankDimensionRow()]
    return {
      report_number:        report.report_number ?? "",
      report_date:          report.report_date ?? "",
      vendor_name:          report.vendor_name ?? "",
      customer:             "",
      description:          report.description ?? "",
      drawing_number:       report.drawing_number ?? jobCard?.drawing_number ?? "",
      drawing_revision:     report.drawing_revision ?? "",
      po_number:            report.po_number ?? jobCard?.po_number ?? "",
      material_code:        report.material_code ?? (jobCard as JobCard & { material_code?: string | null })?.material_code ?? "",
      sample_number:        report.sample_number ?? "",
      heat_number:          report.heat_number ?? jobCard?.heat_number ?? "",
      mp_dp_number:         report.mp_dp_number ?? "",
      instrument_master_id: report.instrument_master_id ?? "",
      instrument_used:      report.instrument_used ?? "",
      gauge_used:           report.gauge_used ?? "",
      visual_satisfactory:  report.visual_satisfactory ?? true,
      inspected_by:         report.inspected_by ?? "",
      approved_by:          report.approved_by ?? report.approved_by_name ?? "",
      result_status:        (report.result_status as DimensionReportInput["result_status"]) ?? "accepted",
      dimensions:           dims.length > 0 ? dims : [blankDimensionRow()],
    }
  }
  // Create mode — auto-fill from job card
  return {
    report_number:        "",
    report_date:          new Date().toISOString().split("T")[0],
    vendor_name:          "",
    customer:             "",
    description:          jobCard?.description ?? "",
    drawing_number:       jobCard?.drawing_number ?? "",
    drawing_revision:     "",
    po_number:            jobCard?.po_number ?? "",
    material_code:        (jobCard as JobCard & { material_code?: string | null })?.material_code ?? "",
    sample_number:        "",
    heat_number:          jobCard?.heat_number ?? "",
    mp_dp_number:         "",
    instrument_master_id: "",
    instrument_used:      "",
    gauge_used:           "",
    visual_satisfactory:  true,
    inspected_by:         "",
    approved_by:          "",
    result_status:        "accepted",
    dimensions:           [blankDimensionRow()],
  }
}

export function DimensionReportForm({
  jobCardId,
  jobCard,
  report,
  instruments,
}: {
  jobCardId: string
  jobCard: JobCard | null
  report: DimensionReport | null
  instruments: InstrumentMaster[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = !!report

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DimensionReportInput>({
    resolver: zodResolver(dimensionReportSchema),
    defaultValues: buildDefaults(report, jobCard),
  })

  const { fields, append, remove } = useFieldArray({ control, name: "dimensions" })

  const watchedInstrumentId = watch("instrument_master_id")
  const selectedInstrument = instruments.find((i) => i.id === watchedInstrumentId)

  function onSubmit(data: DimensionReportInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateDimensionReport(report!.id, data)
        : await createDimensionReport(jobCardId, data)

      if (result.error) {
        toast.error("Save failed", { description: result.error })
        return
      }

      toast.success(isEdit ? "Report updated" : "Report created")
      if (!isEdit && (result as { id?: string }).id) {
        router.push(`/dimension-reports/${(result as { id?: string }).id}`)
      } else {
        router.push(`/dimension-reports/${report!.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">

      {/* ── Report Header ─────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Report Header</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Lbl>Report Number *</Lbl>
              <Input {...register("report_number")} />
              {errors.report_number && <p className="text-xs text-destructive">{errors.report_number.message}</p>}
            </div>
            <div className="space-y-1">
              <Lbl>Report Date *</Lbl>
              <Input type="date" {...register("report_date")} />
              {errors.report_date && <p className="text-xs text-destructive">{errors.report_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Lbl>Vendor / Company Name</Lbl>
              <Input {...register("vendor_name")} />
            </div>
            <div className="space-y-1 col-span-2">
              <Lbl>Description</Lbl>
              <Input {...register("description")} />
            </div>
            <div className="space-y-1">
              <Lbl>Drawing Number *</Lbl>
              <Input {...register("drawing_number")} />
              {errors.drawing_number && <p className="text-xs text-destructive">{errors.drawing_number.message}</p>}
            </div>
            <div className="space-y-1">
              <Lbl>Drawing Revision</Lbl>
              <Input {...register("drawing_revision")} />
            </div>
            <div className="space-y-1">
              <Lbl>PO Number</Lbl>
              <Input {...register("po_number")} />
            </div>
            <div className="space-y-1">
              <Lbl>Material Code</Lbl>
              <Input {...register("material_code")} />
            </div>
            <div className="space-y-1">
              <Lbl>Sample Number</Lbl>
              <Input {...register("sample_number")} />
            </div>
            <div className="space-y-1">
              <Lbl>Heat Number</Lbl>
              <Input {...register("heat_number")} />
            </div>
            <div className="space-y-1">
              <Lbl>MP / DP Number</Lbl>
              <Input {...register("mp_dp_number")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Instrument Details ────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Instrument / Gauge Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1 col-span-2 sm:col-span-3">
              <Lbl>Instrument Master</Lbl>
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                {...register("instrument_master_id")}
                onChange={(e) => {
                  const v = e.target.value
                  setValue("instrument_master_id", v || null)
                  const inst = instruments.find((i) => i.id === v)
                  if (inst) {
                    setValue("instrument_used", inst.instrument_name)
                    setValue("gauge_used", inst.serial_number ?? "")
                  }
                }}
              >
                <option value="">— Select from master (optional) —</option>
                {instruments.filter((i) => i.is_active).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.instrument_name} — {i.instrument_type}
                    {i.serial_number ? ` (S/N: ${i.serial_number})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedInstrument && (
              <div className="col-span-2 sm:col-span-3 rounded bg-muted/50 px-3 py-2 text-xs space-y-0.5">
                <p className="font-medium">{selectedInstrument.instrument_name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                  {selectedInstrument.serial_number && <span>S/N: {selectedInstrument.serial_number}</span>}
                  {selectedInstrument.manufacturer && <span>Mfg: {selectedInstrument.manufacturer}</span>}
                  {selectedInstrument.calibration_due && (
                    <span>Cal. Due: {new Date(selectedInstrument.calibration_due).toLocaleDateString("en-IN")}</span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Lbl>Instrument / Gauge Name (override)</Lbl>
              <Input placeholder="e.g. Vernier Calliper" {...register("instrument_used")} />
            </div>
            <div className="space-y-1">
              <Lbl>Gauge Used / Serial No.</Lbl>
              <Input {...register("gauge_used")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Inspection Details ────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Inspection Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1 col-span-2 sm:col-span-3 flex items-center gap-3">
              <Controller
                control={control}
                name="visual_satisfactory"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="rounded border border-input h-4 w-4"
                    />
                    <span className="text-sm">Visual inspection satisfactory</span>
                  </label>
                )}
              />
            </div>
            <div className="space-y-1">
              <Lbl>Inspected By</Lbl>
              <Input {...register("inspected_by")} />
            </div>
            <div className="space-y-1">
              <Lbl>Approved By</Lbl>
              <Input {...register("approved_by")} />
            </div>
            <div className="space-y-1">
              <Lbl>Overall Result *</Lbl>
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                {...register("result_status")}
              >
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="hold">Hold</option>
              </select>
              {errors.result_status && <p className="text-xs text-destructive">{errors.result_status.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Dimension Table ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dimension Inspection Table</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append(blankDimensionRow())}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {errors.dimensions && typeof errors.dimensions.message === "string" && (
            <p className="text-xs text-destructive mb-2">{errors.dimensions.message}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/70">
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-6">#</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium min-w-[140px]">Dimension / Location *</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Required *</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Tolerance</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Actual 1</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Actual 2</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Actual 3</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Pass/Fail</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium min-w-[100px]">Remarks</th>
                  <th className="border border-border px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const errs = errors.dimensions?.[idx]
                  return (
                    <tr key={field.id} className="hover:bg-muted/30">
                      <td className="border border-border px-2 py-1 text-muted-foreground">{idx + 1}</td>
                      <td className="border border-border px-1 py-0.5">
                        <Input
                          {...register(`dimensions.${idx}.dimension_name`)}
                          className="h-7 text-xs border-0 bg-transparent"
                          placeholder="e.g. Bore Diameter"
                        />
                        {errs?.dimension_name && <p className="text-xs text-destructive">{errs.dimension_name.message}</p>}
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <Input
                          {...register(`dimensions.${idx}.required_dimension`)}
                          className="h-7 text-xs border-0 bg-transparent"
                          placeholder="50.00"
                        />
                        {errs?.required_dimension && <p className="text-xs text-destructive">{errs.required_dimension.message}</p>}
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <Input {...register(`dimensions.${idx}.tolerance`)} className="h-7 text-xs border-0 bg-transparent" placeholder="±0.05" />
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <Input {...register(`dimensions.${idx}.actual_value_1`)} className="h-7 text-xs border-0 bg-transparent" />
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <Input {...register(`dimensions.${idx}.actual_value_2`)} className="h-7 text-xs border-0 bg-transparent" />
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <Input {...register(`dimensions.${idx}.actual_value_3`)} className="h-7 text-xs border-0 bg-transparent" />
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <select
                          {...register(`dimensions.${idx}.pass_fail`)}
                          className="h-7 w-full rounded border-0 bg-transparent text-xs"
                        >
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                          <option value="na">N/A</option>
                        </select>
                      </td>
                      <td className="border border-border px-1 py-0.5">
                        <Input {...register(`dimensions.${idx}.remarks`)} className="h-7 text-xs border-0 bg-transparent" />
                      </td>
                      <td className="border border-border px-1 py-0.5 text-center">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="text-destructive hover:text-destructive/80 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2 text-xs"
            onClick={() => append(blankDimensionRow())}
          >
            <Plus className="h-3 w-3 mr-1" /> Add another row
          </Button>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Update Report" : "Create Report"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
