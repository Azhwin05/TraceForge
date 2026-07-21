"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier"
import { createSupplier, updateSupplier } from "@/app/(app)/inventory/suppliers/actions"
import { ApprovalActions, ApprovalBadge } from "@/components/inventory/approval-actions"
import type { Supplier, UserRole } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared with useForm<any> below
function SupplierFormFields({ register, errors }: { register: any; errors: any }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Supplier Name <span className="text-destructive">*</span></Label>
        <Input id="name" {...register("name")} className="mt-1" />
        <FieldError message={errors.name?.message} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact_name">Contact Name</Label>
          <Input id="contact_name" {...register("contact_name")} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input id="contact_phone" {...register("contact_phone")} className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input id="contact_email" type="email" {...register("contact_email")} className="mt-1" />
        <FieldError message={errors.contact_email?.message} />
      </div>
      <div>
        <Label htmlFor="gst_no">GST No.</Label>
        <Input id="gst_no" {...register("gst_no")} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" {...register("address")} className="mt-1" rows={2} />
      </div>
    </div>
  )
}

function SupplierDialog({
  mode, supplier, open, onOpenChange,
}: {
  mode: "create" | "edit"
  supplier?: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<any>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contact_name: supplier.contact_name ?? "",
          contact_phone: supplier.contact_phone ?? "",
          contact_email: supplier.contact_email ?? "",
          address: supplier.address ?? "",
          gst_no: supplier.gst_no ?? "",
        }
      : { name: "" },
  })

  async function onSubmit(data: SupplierInput) {
    setServerError(null)
    const result = mode === "create"
      ? await createSupplier(data)
      : await updateSupplier(supplier!.id, data)
    if (result.error) { setServerError(result.error); return }
    if (mode === "create" && "pending" in result && result.pending) {
      toast.info("Supplier submitted for admin approval")
    }
    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Supplier" : "Edit Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <SupplierFormFields register={register} errors={errors} />
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Create Supplier" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SupplierListClient({ records, userRole }: { records: Supplier[]; userRole: UserRole }) {
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  const canCreate = ["admin", "engineer"].includes(userRole)
  const isAdmin = userRole === "admin"
  const pendingSuppliers = records.filter((s) => s.approval_status === "pending")

  const filtered = records.filter((s) => {
    const q = search.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || (s.gst_no ?? "").toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{records.length} total</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Supplier
          </Button>
        )}
      </div>

      {isAdmin && pendingSuppliers.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">
            {pendingSuppliers.length} supplier{pendingSuppliers.length > 1 ? "s" : ""} awaiting your approval
          </h2>
          <div className="divide-y divide-amber-200">
            {pendingSuppliers.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.contact_name, s.contact_phone, s.gst_no ? `GST ${s.gst_no}` : null].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <ApprovalActions kind="supplier" id={s.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">{search ? "No suppliers match your search." : "No suppliers found."}</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      s.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                  <ApprovalBadge status={s.approval_status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {s.contact_name && <span>{s.contact_name}</span>}
                  {s.contact_phone && <span>{s.contact_phone}</span>}
                  {s.gst_no && <span>GST: {s.gst_no}</span>}
                </div>
              </div>
              {canCreate && (
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canCreate && <SupplierDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />}
      {canCreate && editing && (
        <SupplierDialog
          mode="edit"
          supplier={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}
