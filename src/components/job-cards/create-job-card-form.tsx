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
import { createJobCardSchema, createClientSchema, type CreateJobCardInput, type CreateClientInput } from "@/lib/validations/job-card"
import { createJobCard, createClient_ } from "@/app/(app)/job-cards/actions"
import type { Client } from "@/types/database"

const PROCESS_OPTIONS = [
  { value: "welding",   label: "Welding" },
  { value: "machining", label: "Machining" },
  { value: "cladding",  label: "Cladding" },
  { value: "overlay",   label: "Overlay" },
] as const

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-3">
      <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">{children}</h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function CreateJobCardForm({ initialClients }: { initialClients: Client[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clients, setClients] = useState(initialClients)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProcessTypes, setSelectedProcessTypes] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateJobCardInput>({
    resolver: zodResolver(createJobCardSchema),
    defaultValues: {
      quantity: 1,
      received_date: new Date().toISOString().split("T")[0],
      process_type: [],
    },
  })

  const clientForm = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
  })

  function toggleProcess(value: string) {
    const next = selectedProcessTypes.includes(value)
      ? selectedProcessTypes.filter((v) => v !== value)
      : [...selectedProcessTypes, value]
    setSelectedProcessTypes(next)
    setValue("process_type", next as CreateJobCardInput["process_type"], { shouldValidate: true })
  }

  function onSubmit(data: CreateJobCardInput) {
    startTransition(async () => {
      const result = await createJobCard(data)
      if (result.error) {
        toast.error("Failed to create job card", { description: result.error })
      } else {
        toast.success("Job card created")
        router.push(`/job-cards/${result.id}`)
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

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6 space-y-6">

            {/* Client */}
            <div>
              <SectionHeading>Client</SectionHeading>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="client_id">Client <span className="text-destructive">*</span></Label>
                  <select
                    id="client_id"
                    {...register("client_id")}
                    aria-invalid={!!errors.client_id}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring aria-invalid:border-destructive"
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> New Client
                  </Button>
                </div>
              </div>
            </div>

            {/* Reference Numbers */}
            <div>
              <SectionHeading>Job Details</SectionHeading>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="nbdn_number">NBDN Number <span className="text-destructive">*</span></Label>
                    <Input id="nbdn_number" placeholder="NBDN-2025-001" {...register("nbdn_number")} aria-invalid={!!errors.nbdn_number} />
                    {errors.nbdn_number && <p className="text-xs text-destructive">{errors.nbdn_number.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="po_number">PO Number <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                    <Input id="po_number" placeholder="PO-12345" {...register("po_number")} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the job work to be done..."
                    {...register("description")}
                    aria-invalid={!!errors.description}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="drawing_number">Drawing No. <span className="text-muted-foreground font-normal text-xs">(opt.)</span></Label>
                    <Input id="drawing_number" {...register("drawing_number")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heat_number">Heat No. <span className="text-muted-foreground font-normal text-xs">(opt.)</span></Label>
                    <Input id="heat_number" {...register("heat_number")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="part_number">Part No. <span className="text-muted-foreground font-normal text-xs">(opt.)</span></Label>
                    <Input id="part_number" {...register("part_number")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="quantity">Quantity <span className="text-destructive">*</span></Label>
                    <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} aria-invalid={!!errors.quantity} />
                    {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="received_date">Received Date <span className="text-destructive">*</span></Label>
                    <Input id="received_date" type="date" {...register("received_date")} aria-invalid={!!errors.received_date} />
                    {errors.received_date && <p className="text-xs text-destructive">{errors.received_date.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input id="due_date" type="date" {...register("due_date")} aria-invalid={!!errors.due_date} />
                    {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Process Types */}
            <div>
              <SectionHeading>Process Types <span className="text-destructive">*</span></SectionHeading>
              <div className="flex flex-wrap gap-3">
                {PROCESS_OPTIONS.map((opt) => {
                  const checked = selectedProcessTypes.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background hover:bg-muted text-foreground"
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
              {errors.process_type && (
                <p className="text-xs text-destructive mt-2">{errors.process_type.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Job Card"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
            </div>

          </CardContent>
        </Card>
      </form>

      {/* Add Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={clientForm.handleSubmit(onCreateClient)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="client_name">Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="client_name"
                placeholder="Acme Industries Ltd."
                {...clientForm.register("name")}
                aria-invalid={!!clientForm.formState.errors.name}
              />
              {clientForm.formState.errors.name && (
                <p className="text-xs text-destructive">{clientForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contact_name">Contact Person</Label>
                <Input id="contact_name" {...clientForm.register("contact_name")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" {...clientForm.register("contact_phone")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact_email">Email</Label>
              <Input id="contact_email" type="email" {...clientForm.register("contact_email")} />
              {clientForm.formState.errors.contact_email && (
                <p className="text-xs text-destructive">{clientForm.formState.errors.contact_email.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
