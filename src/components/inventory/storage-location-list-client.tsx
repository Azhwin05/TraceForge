"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { storageLocationSchema, type StorageLocationInput } from "@/lib/validations/storage-location"
import { createStorageLocation, updateStorageLocation, deleteStorageLocation, toggleStorageLocationActive } from "@/app/(app)/inventory/locations/actions"
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import type { StorageLocation, UserRole } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function LocationDialog({
  mode, location, open, onOpenChange,
}: {
  mode: "create" | "edit"
  location?: StorageLocation
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<any>({
    resolver: zodResolver(storageLocationSchema),
    defaultValues: location
      ? { code: location.code, name: location.name, description: location.description ?? "" }
      : { code: "", name: "" },
  })

  async function onSubmit(data: StorageLocationInput) {
    setServerError(null)
    const result = mode === "create"
      ? await createStorageLocation(data)
      : await updateStorageLocation(location!.id, data)
    if (result.error) { setServerError(result.error); return }
    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Storage Location" : "Edit Storage Location"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
              <Input id="code" {...register("code")} className="mt-1" placeholder="e.g. RM-01" />
              <FieldError message={errors.code?.message} />
            </div>
            <div>
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" {...register("name")} className="mt-1" placeholder="e.g. Raw Material Store — Rack 1" />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Create Location" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function StorageLocationListClient({ records, userRole }: { records: StorageLocation[]; userRole: UserRole }) {
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<StorageLocation | null>(null)

  const canCreate = ["admin", "engineer"].includes(userRole)
  const isAdmin = userRole === "admin"

  const filtered = records.filter((l) => {
    const q = search.toLowerCase()
    return !q || l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Storage Locations</h1>
          <p className="mt-1 text-sm text-muted-foreground">{records.length} total</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Location
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search locations…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={search ? "No matches" : "No storage locations yet"}
          description={
            search
              ? "Nothing matches that search. Check the spelling, or clear it to see everything."
              : "Locations are the racks and rooms stock is held in — every inward and issue is posted against one."
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.code}</span>
                  <span className="text-muted-foreground">—</span>
                  <span>{l.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      l.is_active ? "bg-success-surface text-success" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {l.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link href={`/inventory/locations/${l.id}`} className="text-sm font-medium text-brand-primary hover:underline">
                  View Contents
                </Link>
                {canCreate && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(l)}>Edit</Button>
                )}
                {isAdmin && (
                  <InventoryRowActions
                    label={`${l.code} — ${l.name}`}
                    isActive={l.is_active}
                    canDeactivate
                    canDelete
                    onDelete={() => deleteStorageLocation(l.id)}
                    onToggleActive={(next) => toggleStorageLocationActive(l.id, next)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canCreate && <LocationDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />}
      {canCreate && editing && (
        <LocationDialog
          mode="edit"
          location={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}
