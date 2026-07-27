"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, RotateCcw, AlertTriangle, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { restoreJobCard, purgeJobCardsNow } from "@/app/(app)/job-cards/actions"
import type { JobCardStatus } from "@/types/database"

export type DeletedJobCard = {
  id: string
  jc_number: string
  description: string
  status: JobCardStatus
  deleted_at: string
  purge_at: string
  client: { name: string } | null
  deleter: { full_name: string } | null
}

function daysRemaining(purgeAt: string): number {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function RestoreButton({ jobCardId, jcNumber }: { jobCardId: string; jcNumber: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleRestore() {
    setBusy(true)
    const res = await restoreJobCard(jobCardId)
    setBusy(false)
    if (res.error) {
      toast.error("Couldn't restore", { description: res.error })
    } else {
      toast.success(`${jcNumber} restored`)
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
    const res = await purgeJobCardsNow()
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
      toast.success(`${purged} job card${purged === 1 ? "" : "s"} permanently deleted`, {
        description: skipped.length > 0
          ? `${skipped.length} skipped (still referenced): ${skipped.map((s) => s.jcNumber).join(", ")}`
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

export function RecycleBinClient({ jobCards }: { jobCards: DeletedJobCard[] }) {
  const overdueCount = jobCards.filter((jc) => daysRemaining(jc.purge_at) === 0).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-muted-foreground" /> Recycle Bin
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deleted job cards are kept here for 6 months and can be restored any time before then.
            After that they&rsquo;re permanently deleted automatically.
          </p>
        </div>
        <Link href="/job-cards" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Job Cards
        </Link>
      </div>

      {jobCards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Recycle Bin is empty.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <PurgeNowButton disabled={overdueCount === 0} />
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {jobCards.map((jc) => {
              const remaining = daysRemaining(jc.purge_at)
              const overdue = remaining === 0
              return (
                <div key={jc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{jc.jc_number}</span>
                      <StatusBadge status={jc.status} />
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Overdue for purge
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {remaining} day{remaining === 1 ? "" : "s"} left
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {jc.client?.name && `${jc.client.name} — `}{jc.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deleted {new Date(jc.deleted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {jc.deleter?.full_name && ` by ${jc.deleter.full_name}`}
                      {" · permanently deleted on "}
                      {new Date(jc.purge_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <RestoreButton jobCardId={jc.id} jcNumber={jc.jc_number} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
