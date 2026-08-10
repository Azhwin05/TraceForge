"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { fullJobCardSchema, fullJobCardCreateSchema, createClientSchema, type FullJobCardInput, type CreateClientInput } from "@/lib/validations/job-card"
import { createJobCard, updateFullJobCard, createClient_ } from "@/app/(app)/job-cards/actions"
import type { Client } from "@/types/database"

const PROCESS_OPTIONS = [
  { value: "welding", label: "Welding" },
  { value: "machining", label: "Machining" },
  { value: "cladding", label: "Cladding" },
  { value: "overlay", label: "Overlay" },
] as const

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-3 pt-2">
      <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">{children}</h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function JobCardFullForm({
  initialClients,
  mode = "create",
  jobCardId,
  defaultValues,
}: {
  initialClients: Client[]
  mode?: "create" | "edit"
  jobCardId?: string
  defaultValues?: Partial<FullJobCardInput>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clients, setClients] = useState(initialClients)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProcessTypes, setSelectedProcessTypes] = useState<string[]>(
    defaultValues?.process_type ?? []
  )

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FullJobCardInput>({
    // Creation requires a Purchase Order (client request #6); editing does not,
    // so pre-existing job cards without a PO stay editable. See the schema.
    resolver: zodResolver(mode === "edit" ? fullJobCardSchema : fullJobCardCreateSchema),
    defaultValues: {
      quantity: 1,
      received_date: new Date().toISOString().split("T")[0],
      process_type: [],
      ...defaultValues,
    },
  })

  const clientForm = useForm<CreateClientInput>({ resolver: zodResolver(createClientSchema) })

  function toggleProcess(value: string) {
    const next = selectedProcessTypes.includes(value)
      ? selectedProcessTypes.filter((v) => v !== value)
      : [...selectedProcessTypes, value]
    setSelectedProcessTypes(next)
    setValue("process_type", next as FullJobCardInput["process_type"], { shouldValidate: true })
  }

  function onSubmit(data: FullJobCardInput) {
    startTransition(async () => {
      const result =
        mode === "edit" && jobCardId
          ? await updateFullJobCard(jobCardId, data)
          : await createJobCard(data)
      if (result.error) {
        toast.error(mode === "edit" ? "Failed to save changes" : "Failed to create job card", { description: result.error })
      } else {
        toast.success(mode === "edit" ? "Job card updated" : "Job card created")
        router.push(`/job-cards/${result.id}`)
        router.refresh()
      }
    })
  }

  function onCreateClient(data: CreateClientInput) {
    startTransition(async () => {
      const result = await createClient_(data)
      if (result.error) {
        toast.error("Failed to create client", { description: result.error })
        return
      }
      if (result.client) {
        const newClient = result.client as Client
        setClients((prev) => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))
        setValue("client_id", newClient.id, { shouldValidate: true })
        toast.success(`Client "${newClient.name}" added`)
        setDialogOpen(false)
        clientForm.reset()
      }
    })
  }

  const num = { valueAsNumber: true }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6 space-y-5">

            {/* ── Client ── */}
            <div>
              <SectionHeading>Client</SectionHeading>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="Client *" error={errors.client_id?.message}>
                    <select
                      {...register("client_id")}
                      aria-invalid={!!errors.client_id}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring aria-invalid:border-destructive"
                    >
                      <option value="">Select client...</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> New Client
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Header / Identity ── */}
            <div>
              <SectionHeading>Job Details</SectionHeading>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="NBDN Number *" error={errors.nbdn_number?.message}>
                    <Input placeholder="NBDN-2025-001" {...register("nbdn_number")} aria-invalid={!!errors.nbdn_number} />
                  </Field>
                  <Field
                    label="PO Number"
                    hint={mode === "edit" ? "(opt.)" : "(required)"}
                    error={errors.po_number?.message}
                  >
                    <Input {...register("po_number")} />
                  </Field>
                  <Field label="Product Group" hint="(opt.)"><Input placeholder="CBE" {...register("product_group")} /></Field>
                  <Field label="Buyer" hint="(opt.)"><Input {...register("buyer")} /></Field>
                </div>

                <Field label="Description *" error={errors.description?.message}>
                  <Textarea placeholder="e.g. 6&quot; 900 WCB Body — Overlay + Machining" {...register("description")} aria-invalid={!!errors.description} />
                </Field>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Part No." hint="(opt.)"><Input {...register("part_number")} /></Field>
                  <Field label="Heat No." hint="(opt.)"><Input {...register("heat_number")} /></Field>
                  <Field label="Drawing No." hint="(opt.)"><Input {...register("drawing_number")} /></Field>
                  <Field label="Material Code" hint="(opt.)"><Input placeholder="01N0" {...register("material_code")} /></Field>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Regularization" hint="(opt.)"><Input {...register("regularization")} /></Field>
                  <Field label="WPS No." hint="(opt.)"><Input placeholder="WPS/RE/301" {...register("wps_no")} /></Field>
                  <Field label="Ring" hint="(opt.)"><Input {...register("ring")} /></Field>
                  <Field label="Ring Heat No." hint="(opt.)"><Input {...register("ring_heat_no")} /></Field>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="MPI / RT No." hint="(opt.)"><Input {...register("mpi_rt_no")} /></Field>
                  <Field label="Valve Size / Class" hint="(opt.)"><Input placeholder={'6" 900#'} {...register("valve_size_class")} /></Field>
                  <Field label="Valve Type / Component" hint="(opt.)"><Input placeholder="Body" {...register("valve_type_component")} /></Field>
                  <Field label="Welding Process" hint="(opt.)"><Input placeholder="SMAW" {...register("welding_process")} /></Field>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Base Material" hint="(opt.)"><Input placeholder="WCB" {...register("base_material")} /></Field>
                  <Field label="Base Material Grade" hint="(opt.)"><Input {...register("base_material_grade")} /></Field>
                  <Field label="Overlay Material" hint="(opt.)"><Input placeholder="E8018-B2" {...register("overlay_material")} /></Field>
                  <Field label="" ><span /></Field>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Field label="Quantity *" error={errors.quantity?.message}>
                    <Input type="number" min={1} {...register("quantity", num)} aria-invalid={!!errors.quantity} />
                  </Field>
                  <Field label="Received Date *" error={errors.received_date?.message}>
                    <Input type="date" {...register("received_date")} aria-invalid={!!errors.received_date} />
                  </Field>
                  <Field label="Due Date" hint="(opt.)"><Input type="date" {...register("due_date")} /></Field>
                </div>
              </div>
            </div>

            {/* ── Consumable Data ── */}
            <div>
              <SectionHeading>Consumable Data</SectionHeading>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Field label="Brand"><Input placeholder="D&H Secheron" {...register("consumable_brand")} /></Field>
                <Field label="AWS Class"><Input placeholder="E8018-B2" {...register("consumable_aws_class")} /></Field>
                <Field label="Size"><Input placeholder="4.0mm" {...register("consumable_size")} /></Field>
                <Field label="Batch No."><Input {...register("consumable_batch_no")} /></Field>
                <Field label="MFG Date"><Input type="date" {...register("consumable_mfg_date")} /></Field>
              </div>
            </div>

            {/* ── Welding Details ── */}
            <div>
              <SectionHeading>Welding Details</SectionHeading>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Field label="Welder Name"><Input {...register("welder_name")} /></Field>
                <Field label="Welder ID"><Input {...register("welder_id")} /></Field>
                <Field label="Weld Metal"><Input placeholder="E8018-B2" {...register("weld_metal")} /></Field>
                <Field label="Weld Height (mm)"><Input type="number" step="0.1" {...register("weld_height", num)} /></Field>
                <Field label="Weld Date"><Input type="date" {...register("weld_date")} /></Field>
                <Field label="Weld Qty — WPS"><Input type="number" {...register("weld_qty_planned", num)} /></Field>
                <Field label="Weld Qty — Actual"><Input type="number" {...register("weld_qty_actual", num)} /></Field>
              </div>

              {/* As-per-WPS / Actual parameter table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th className="border border-border p-1.5 font-semibold w-24"> </th>
                      <th className="border border-border p-1.5 font-semibold">Pre-Heat °C</th>
                      <th className="border border-border p-1.5 font-semibold">Inter-pass °C</th>
                      <th className="border border-border p-1.5 font-semibold">Post-Heat °C</th>
                      <th className="border border-border p-1.5 font-semibold">Amp</th>
                      <th className="border border-border p-1.5 font-semibold">Volt</th>
                      <th className="border border-border p-1.5 font-semibold">Travel Speed</th>
                      <th className="border border-border p-1.5 font-semibold">Gas Flow</th>
                      <th className="border border-border p-1.5 font-semibold">Feed Rate</th>
                      <th className="border border-border p-1.5 font-semibold">Polarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border p-1 font-medium text-muted-foreground">As per WPS</td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" {...register("pre_heat_temp_planned", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" {...register("inter_pass_temp_planned", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" {...register("post_heat_temp_planned", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" placeholder="140-180" {...register("amps_required")} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" placeholder="24-28" {...register("volts_required")} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("travel_speed_planned", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("gas_flow_rate_planned", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("consumable_feed_rate_planned", num)} /></td>
                      <td className="border border-border p-0.5">
                        <select className="h-7 w-full border-0 bg-transparent text-xs" {...register("polarity_planned")}>
                          <option value="">—</option><option value="DCRP">DCRP</option><option value="DCSP">DCSP</option><option value="AC">AC</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-border p-1 font-medium text-muted-foreground">Actual</td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" {...register("pre_heat_temp", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" {...register("inter_pass_temp", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" {...register("post_heat_temp", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("amps_actual", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("volts_actual", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("travel_speed", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("gas_flow_rate", num)} /></td>
                      <td className="border border-border p-0.5"><Input className="h-7 border-0" type="number" step="0.1" {...register("consumable_feed_rate", num)} /></td>
                      <td className="border border-border p-0.5">
                        <select className="h-7 w-full border-0 bg-transparent text-xs" {...register("polarity")}>
                          <option value="">—</option><option value="DCRP">DCRP</option><option value="DCSP">DCSP</option><option value="AC">AC</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Closing ── */}
            <div>
              <SectionHeading>Closing Details</SectionHeading>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Weld Deposit Thickness (before)"><Input {...register("weld_deposit_thickness_before")} /></Field>
                  <Field label="After M/C Weld Deposit Thickness"><Input {...register("weld_deposit_thickness_after")} /></Field>
                </div>
                <Field label="Punching Details"><Input placeholder="RE/FIIV/DPOR/SROR" {...register("punching_details")} /></Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Despatch DC No."><Input {...register("despatch_dc_no")} /></Field>
                  <Field label="Despatch Date"><Input type="date" {...register("despatch_date")} /></Field>
                  <Field label="Other Details"><Input placeholder="RAG7208/25-26" {...register("other_details")} /></Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Production — Checked By"><Input {...register("production_checked_by")} /></Field>
                  <Field label="QC — Checked By"><Input {...register("qc_checked_by")} /></Field>
                  <Field label="Stores — Checked By"><Input {...register("stores_checked_by")} /></Field>
                  <Field label="Production — Date"><Input type="date" {...register("production_checked_date")} /></Field>
                  <Field label="QC — Date"><Input type="date" {...register("qc_checked_date")} /></Field>
                  <Field label="Stores — Date"><Input type="date" {...register("stores_checked_date")} /></Field>
                </div>
              </div>
            </div>

            {/* ── Process Types ── */}
            <div>
              <SectionHeading>Process Types *</SectionHeading>
              <div className="flex flex-wrap gap-3">
                {PROCESS_OPTIONS.map((opt) => {
                  const checked = selectedProcessTypes.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        checked ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleProcess(opt.value)} />
                      <span className={`flex h-4 w-4 items-center justify-center rounded border-2 text-[10px] font-bold ${
                        checked ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                      }`}>
                        {checked && "✓"}
                      </span>
                      {opt.label}
                    </label>
                  )
                })}
              </div>
              {errors.process_type && <p className="text-xs text-destructive mt-2">{errors.process_type.message}</p>}
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Job Card"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            </div>

          </CardContent>
        </Card>
      </form>

      {/* Add Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <form onSubmit={clientForm.handleSubmit(onCreateClient)} className="space-y-3">
            <Field label="Company Name *" error={clientForm.formState.errors.name?.message}>
              <Input placeholder="Acme Industries Ltd." {...clientForm.register("name")} aria-invalid={!!clientForm.formState.errors.name} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Person"><Input {...clientForm.register("contact_name")} /></Field>
              <Field label="Phone"><Input {...clientForm.register("contact_phone")} /></Field>
            </div>
            <Field label="Email" error={clientForm.formState.errors.contact_email?.message}>
              <Input type="email" {...clientForm.register("contact_email")} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Client"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
