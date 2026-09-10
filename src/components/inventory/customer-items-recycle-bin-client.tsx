"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, RotateCcw, AlertTriangle, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { restoreCustomerItem, purgeCustomerItemsNow } from "@/app/(app)/inventory/customers/actions"

export type DeletedCustomerItem = {
  id: string
  item_name: string
  status: string
  deleted_at: string
  purge_at: string
  client: { id: string; name: string } | null
  deleter: { full_name: string } | null
}

function daysRemaining(purgeAt: string): number {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function RestoreButton({ id, itemName }: { id: string; itemName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleRestore() {
    setBusy(true)
    const res = await restoreCustomerItem(id)
    setBusy(false)
    if (res.error) {
      toast.error("Couldn't restore", { description: res.error })
    } else {
      toast.success(`${itemName} restored`)
      router.refresh()
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={handleRestore}>
      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Restoring…" : "Restore"}
    </Button>
  )
}

function PurgeNowButton({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handlePurge() {
    setBusy(true)
    const res = await purgeCustomerItemsNow()
    setBusy(false)
    setConfirming(false)
    if (res.error) {
      toast.error("Purge failed", { description: res.error })
      return
    }
    const purged = res.purged ?? 0
    const skipped = res.skipped ?? []
    if (purged === 0 && skipped.length === 0) {
      toast.info("Nothing is due for permanent deletion yet")
    } else {
      toast.success(`${purged} item${purged === 1 ? "" : "s"} permanently deleted`, {
        description: skipped.length > 0
          ? `${skipped.length} skipped (still referenced): ${skipped.map((s) => s.itemName).join(", ")}`
          : undefined,
      })
    }
    router.refresh()
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => setConfirming(true)}
        className="text-destructive border-destructive/30 hover:bg-destructive/10">
        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Purge Overdue Now
      </Button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-destructive">Permanently delete everything past its retention date?</span>
      <Button size="sm" variant="destructive" disabled={busy} onClick={handlePurge}>
        {busy ? "Purging…" : "Confirm"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  )
}

export function CustomerItemsRecycleBinClient({ items }: { items: DeletedCustomerItem[] }) {
  const overdueCount = items.filter((it) => daysRemaining(it.purge_at) === 0).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-muted-foreground" /> Customer Items Recycle Bin
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deleted items are kept here for 6 months and can be restored any time before then.
            After that they&rsquo;re permanently deleted automatically.
          </p>
        </div>
        <Link href="/inventory/customers" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Customers
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Recycle Bin is empty.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <PurgeNowButton disabled={overdueCount === 0} />
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {items.map((it) => {
              const remaining = daysRemaining(it.purge_at)
              const overdue = remaining === 0
              return (
                <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{it.item_name}</span>
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-surface px-2 py-0.5 text-xs font-medium text-danger">
                          <AlertTriangle className="h-3 w-3" /> Overdue for purge
                        </span>
                      ) : (
                        <span className="rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning">
                          {remaining} day{remaining === 1 ? "" : "s"} left
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {it.client?.name && `Customer: ${it.client.name} · `}
                      Deleted {new Date(it.deleted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {it.deleter?.full_name && ` by ${it.deleter.full_name}`}
                      {" · permanently deleted on "}
                      {new Date(it.purge_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <RestoreButton id={it.id} itemName={it.item_name} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
