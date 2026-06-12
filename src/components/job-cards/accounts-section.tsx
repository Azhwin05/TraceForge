"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DollarSign, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { accountsSchema, type AccountsInput } from "@/lib/validations/process-execution"
import { upsertAccounts } from "@/app/(app)/job-cards/detail-actions"
import type { Accounts, JobCardStatus, UserRole } from "@/types/database"

const GRN_LABELS = { pending: "Pending", received: "GRN Received", held: "GRN Held" }
const PAY_LABELS = { pending: "Pending", partial: "Partial", received: "Received" }

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  )
}

export function AccountsSection({
  jobCardId,
  status,
  userRole,
  account,
}: {
  jobCardId: string
  status: JobCardStatus
  userRole: UserRole
  account: Accounts | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const canEdit = ["admin", "accounts"].includes(userRole)
  const activeStatuses: JobCardStatus[] = ["accounts_processing", "closed"]
  const isVisible = activeStatuses.includes(status) || !!account

  const { register, handleSubmit, reset } = useForm<AccountsInput>({
    resolver: zodResolver(accountsSchema),
    defaultValues: account
      ? {
          po_number: account.po_number ?? "",
          po_value: account.po_value ?? undefined,
          invoice_number: account.invoice_number ?? "",
          invoice_date: account.invoice_date ?? "",
          invoice_value: account.invoice_value ?? undefined,
          grn_status: (account.grn_status as "pending" | "received" | "held") ?? undefined,
          grn_date: account.grn_date ?? "",
          payment_status: (account.payment_status as "pending" | "partial" | "received") ?? undefined,
          payment_date: account.payment_date ?? "",
          payment_amount: account.payment_amount ?? undefined,
          due_date: account.due_date ?? "",
          tally_reference: account.tally_reference ?? "",
          notes: account.notes ?? "",
        }
      : {},
  })

  if (!isVisible) return null

  function onSubmit(data: AccountsInput) {
    startTransition(async () => {
      const result = await upsertAccounts(jobCardId, account?.id ?? null, data)
      if (result.error) {
        toast.error("Failed to save", { description: result.error })
      } else {
        toast.success("Accounts updated")
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Accounts
            </CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true) }}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {account ? "Edit" : "Add Account Info"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {account ? (
            <div className="space-y-2">
              <InfoRow label="PO Number" value={account.po_number} />
              <InfoRow
                label="PO Value"
                value={account.po_value != null ? `₹${Number(account.po_value).toLocaleString("en-IN")}` : null}
              />
              <InfoRow label="Invoice Number" value={account.invoice_number} />
              <InfoRow label="Invoice Date" value={account.invoice_date ? new Date(account.invoice_date).toLocaleDateString("en-IN") : null} />
              <InfoRow
                label="Invoice Value"
                value={account.invoice_value != null ? `₹${Number(account.invoice_value).toLocaleString("en-IN")}` : null}
              />
              <InfoRow label="GRN Status" value={GRN_LABELS[account.grn_status as keyof typeof GRN_LABELS]} />
              {account.grn_date && (
                <InfoRow label="GRN Date" value={new Date(account.grn_date).toLocaleDateString("en-IN")} />
              )}
              <InfoRow label="Payment Status" value={PAY_LABELS[account.payment_status as keyof typeof PAY_LABELS]} />
              {account.payment_date && (
                <InfoRow label="Payment Date" value={new Date(account.payment_date).toLocaleDateString("en-IN")} />
              )}
              {account.payment_amount != null && (
                <InfoRow label="Amount Received" value={`₹${Number(account.payment_amount).toLocaleString("en-IN")}`} />
              )}
              {account.due_date && (
                <InfoRow label="Due Date" value={new Date(account.due_date).toLocaleDateString("en-IN")} />
              )}
              {account.tally_reference && (
                <InfoRow label="Tally Ref" value={account.tally_reference} />
              )}
              {account.notes && (
                <InfoRow label="Notes" value={account.notes} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No account information added yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{account ? "Edit Account Info" : "Add Account Info"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>PO Number</Label>
                <Input placeholder="PO-2024-001" {...register("po_number")} />
              </div>
              <div className="space-y-1">
                <Label>PO Value (₹)</Label>
                <Input type="number" step="0.01" {...register("po_value", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Invoice Number</Label>
                <Input placeholder="INV-001" {...register("invoice_number")} />
              </div>
              <div className="space-y-1">
                <Label>Invoice Date</Label>
                <Input type="date" {...register("invoice_date")} />
              </div>
              <div className="space-y-1">
                <Label>Invoice Value (₹)</Label>
                <Input type="number" step="0.01" {...register("invoice_value", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input type="date" {...register("due_date")} />
              </div>
              <div className="space-y-1">
                <Label>GRN Status</Label>
                <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("grn_status")}>
                  <option value="pending">Pending</option>
                  <option value="received">Received</option>
                  <option value="held">Held</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>GRN Date</Label>
                <Input type="date" {...register("grn_date")} />
              </div>
              <div className="space-y-1">
                <Label>Payment Status</Label>
                <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("payment_status")}>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Payment Date</Label>
                <Input type="date" {...register("payment_date")} />
              </div>
              <div className="space-y-1">
                <Label>Amount Received (₹)</Label>
                <Input type="number" step="0.01" {...register("payment_amount", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Tally Reference</Label>
                <Input placeholder="Tally voucher no." {...register("tally_reference")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes..." className="min-h-[80px]" {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
