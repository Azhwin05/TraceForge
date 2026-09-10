"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { setItemApproval } from "@/app/(app)/inventory/items/actions"
import { setSupplierApproval } from "@/app/(app)/inventory/suppliers/actions"

/** Approve / reject controls for a pending item or supplier (admin only). */
export function ApprovalActions({ kind, id }: { kind: "item" | "supplier"; id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function decide(decision: "approved" | "rejected") {
    let reason: string | undefined
    if (decision === "rejected") {
      reason = window.prompt("Reason for rejection (optional):") ?? undefined
    }
    setBusy(true)
    const res = kind === "item"
      ? await setItemApproval(id, decision, reason)
      : await setSupplierApproval(id, decision, reason)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(decision === "approved" ? "Approved" : "Rejected")
      router.refresh()
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        className="border-success-border text-success hover:bg-success-surface"
        onClick={() => decide("approved")}
      >
        <Check className="mr-1 h-3.5 w-3.5" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        className="border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={() => decide("rejected")}
      >
        <X className="mr-1 h-3.5 w-3.5" /> Reject
      </Button>
    </div>
  )
}

/** Small status pill for an item/supplier's approval state. */
export function ApprovalBadge({ status }: { status: string }) {
  if (status === "approved") return null
  const map: Record<string, string> = {
    pending:  "bg-warning-surface text-warning",
    rejected: "bg-danger-surface text-danger",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status === "pending" ? "Pending approval" : status}
    </span>
  )
}
