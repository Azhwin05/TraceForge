"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Search, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import { customerSchema, type CustomerInput } from "@/lib/validations/customer"
import { createCustomer, updateCustomer, deleteCustomer } from "@/app/(app)/inventory/customers/actions"
import type { Client, UserRole } from "@/types/database"

export type CustomerRow = Client & { customer_items: { status: string; deleted_at: string | null }[] }

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared with useForm<any> below
function CustomerFormFields({ register, errors }: { register: any; errors: any }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Customer Name <span className="text-destructive">*</span></Label>
        <Input id="name" {...register("name")} className="mt-1" placeholder="e.g. L&T Valves" />
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
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" {...register("address")} className="mt-1" rows={2} />
      </div>
    </div>
  )
}

function CustomerDialog({
  mode, customer, open, onOpenChange,
}: {
  mode: "create" | "edit"
  customer?: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<any>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          contact_name: customer.contact_name ?? "",
          contact_email: customer.contact_email ?? "",
          contact_phone: customer.contact_phone ?? "",
          address: customer.address ?? "",
        }
      : { name: "" },
  })

  async function onSubmit(data: CustomerInput) {
    setServerError(null)
    const result = mode === "create"
      ? await createCustomer(data)
      : await updateCustomer(customer!.id, data)
    if (result.error) { setServerError(result.error); return }
    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Customer" : "Edit Customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <CustomerFormFields register={register} errors={errors} />
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Create Customer" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CustomerListClient({ records, userRole }: { records: CustomerRow[]; userRole: UserRole }) {
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const isAdmin = userRole === "admin"
  const isCreator = isAdmin || userRole === "operator"

  const filtered = records.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{records.length} total — shared with Job Tracker</p>
        </div>
        {isCreator && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Customer
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">{search ? "No customers match your search." : "No customers yet."}</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((c) => {
            const liveItems = c.customer_items.filter((it) => !it.deleted_at)
            const pendingCount = liveItems.filter((it) => it.status === "pending").length
            return (
              <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors">
                <Link href={`/inventory/customers/${c.id}`} className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {liveItems.length} item{liveItems.length === 1 ? "" : "s"}
                    </span>
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {c.contact_name && <span>{c.contact_name}</span>}
                    {c.contact_phone && <span>{c.contact_phone}</span>}
                    {c.contact_email && <span>{c.contact_email}</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>
                      <InventoryRowActions
                        label={c.name}
                        canDelete
                        onDelete={() => deleteCustomer(c.id)}
                        deleteDescription="This permanently removes the customer. Blocked if they have job card history or items on file — remove those first."
                      />
                    </>
                  )}
                  <Link href={`/inventory/customers/${c.id}`}>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isCreator && <CustomerDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />}
      {isAdmin && editing && (
        <CustomerDialog
          mode="edit"
          customer={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}
