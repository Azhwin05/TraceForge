"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Pencil, Clock } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import { customerItemEditSchema, type CustomerItemEditInput } from "@/lib/validations/customer"
import { updateCustomerItem, deleteCustomerItem } from "@/app/(app)/inventory/customers/actions"
import type { Client, CustomerItem, UserRole } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function EditItemDialog({
  item, clientId, open, onOpenChange,
}: {
  item: CustomerItem
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(customerItemEditSchema),
    defaultValues: {
      item_name: item.item_name,
      item_date: item.item_date ?? "",
      description: item.description ?? "",
      drawing_number: item.drawing_number ?? "",
      quantity: item.quantity ?? undefined,
      uom: item.uom ?? "",
      remarks: item.remarks ?? "",
      status: item.status,
    },
  })

  async function onSubmit(data: CustomerItemEditInput) {
    setServerError(null)
    const result = await updateCustomerItem(item.id, clientId, data)
    if (result.error) { setServerError(result.error); return }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.status === "pending" ? "Complete Item Details" : "Edit Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="item_name">Item Name <span className="text-destructive">*</span></Label>
              <Input id="item_name" {...register("item_name")} className="mt-1" />
              <FieldError message={errors.item_name?.message} />
            </div>
            <div>
              <Label htmlFor="item_date">Date</Label>
              <Input id="item_date" type="date" {...register("item_date")} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="drawing_number">Drawing Number</Label>
              <Input id="drawing_number" {...register("drawing_number")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" step="0.001" {...register("quantity")} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="uom">Unit</Label>
            <Input id="uom" {...register("uom")} className="mt-1" placeholder="e.g. nos, kg" />
          </div>
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...register("remarks")} className="mt-1" rows={2} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" {...register("status")} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="pending">Pending — details to be added later</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CustomerDetailClient({
  customer, items, userRole,
}: {
  customer: Client
  items: CustomerItem[]
  userRole: UserRole
}) {
  const [editing, setEditing] = useState<CustomerItem | null>(null)
  const isAdmin = userRole === "admin"

  const pendingItems = items.filter((it) => it.status === "pending")
  const completeItems = items.filter((it) => it.status === "complete")

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[customer.contact_name, customer.contact_phone, customer.contact_email].filter(Boolean).join(" · ") || "No contact details on file"}
          </p>
        </div>
        {isAdmin && (
          <Link href={`/inventory/customers/${customer.id}/items/new`} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Items
          </Link>
        )}
      </div>

      {pendingItems.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" /> {pendingItems.length} item{pendingItems.length > 1 ? "s" : ""} awaiting details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{it.item_name}</p>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {it.item_date && <span>{new Date(it.item_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                    {it.remarks && <span>{it.remarks}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(it)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Complete
                      </Button>
                      <InventoryRowActions
                        label={it.item_name}
                        canDelete
                        onDelete={() => deleteCustomerItem(it.id, customer.id)}
                        deleteDescription="This moves the item to the Recycle Bin. It's fully restorable there for 6 months, then permanently deleted."
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items ({completeItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed items yet.</p>
          ) : (
            completeItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{it.item_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {it.item_date && <span>{new Date(it.item_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                    {it.description && <span>{it.description}</span>}
                    {it.drawing_number && <span>Drawing: {it.drawing_number}</span>}
                    {it.quantity != null && <span>Qty: {it.quantity} {it.uom ?? ""}</span>}
                  </div>
                  {it.remarks && <p className="mt-0.5 text-xs text-muted-foreground">{it.remarks}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(it)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <InventoryRowActions
                      label={it.item_name}
                      canDelete
                      onDelete={() => deleteCustomerItem(it.id, customer.id)}
                      deleteDescription="This moves the item to the Recycle Bin. It's fully restorable there for 6 months, then permanently deleted."
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing && (
        <EditItemDialog
          item={editing}
          clientId={customer.id}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}
