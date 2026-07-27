"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  machineSchema,
  MACHINE_CATEGORIES,
  type MachineInput,
} from "@/lib/validations/machine"
import {
  createMachine,
  updateMachine,
} from "@/app/(app)/master-data/machines/actions"
function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

interface Props {
  mode: "create" | "edit"
  machineId?: string
  defaultValues?: Partial<MachineInput>
}

export function MachineForm({ mode, machineId, defaultValues }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      machine_code: "",
      name: "",
      category: "machining",
      ...defaultValues,
    },
  })

  async function onSubmit(data: MachineInput) {
    setServerError(null)
    if (mode === "create") {
      const result = await createMachine(data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/machines/${result.id}`)
    } else {
      const result = await updateMachine(machineId!, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/machines/${machineId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Machine Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="machine_code">Machine Code <span className="text-destructive">*</span></Label>
            <Input id="machine_code" {...register("machine_code")} className="mt-1" placeholder="e.g. CNC-VTL-01, WLD-03" />
            <FieldError message={errors.machine_code?.message} />
          </div>
          <div>
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input id="name" {...register("name")} className="mt-1" placeholder="e.g. Vertical Turret Lathe" />
            <FieldError message={errors.name?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
            <select
              id="category"
              {...register("category")}
              className={cn(
                "mt-1 flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring/50"
              )}
            >
              {MACHINE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <FieldError message={errors.category?.message} />
            <p className="mt-1 text-xs text-muted-foreground">
              Welding machines are assignable only to the Welding operation; machining machines to the machining steps.
            </p>
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} className="mt-1" placeholder="e.g. Bay 2, Shop Floor A" />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            {...register("notes")}
            rows={3}
            className={cn(
              "mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            )}
            placeholder="Capacity, model, maintenance notes…"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Machine" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              mode === "edit" && machineId
                ? `/master-data/machines/${machineId}`
                : "/master-data/machines"
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
