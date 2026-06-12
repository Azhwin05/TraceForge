"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ClipboardCheck, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { signOffSchema, type SignOffInput } from "@/lib/validations/job-card"
import { upsertSignOff } from "@/app/(app)/job-cards/traveller-actions"
import type { JobCard, UserRole } from "@/types/database"

function SignRow({ label, by, date }: { label: string; by?: string | null; date?: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex-1 flex items-center justify-between text-sm">
        <span className={by ? "font-medium" : "text-muted-foreground italic"}>
          {by ?? "Pending"}
        </span>
        <span className="text-muted-foreground text-xs ml-4">
          {date ? new Date(date).toLocaleDateString("en-IN") : ""}
        </span>
      </div>
    </div>
  )
}

function canEditSection(role: UserRole, section: "production" | "qc" | "stores") {
  if (role === "admin") return true
  if (role === "engineer" && section === "production") return true
  if (role === "qa" && section === "qc") return true
  if (role === "accounts" && section === "stores") return true
  return false
}

export function SignOffSection({
  jobCard,
  userRole,
}: {
  jobCard: JobCard
  userRole: UserRole
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)

  const canEdit = ["admin", "engineer", "qa", "accounts"].includes(userRole)
  const showProduction = canEditSection(userRole, "production") || !!(jobCard.production_checked_by)
  const showQc         = canEditSection(userRole, "qc")         || !!(jobCard.qc_checked_by)
  const showStores     = canEditSection(userRole, "stores")     || !!(jobCard.stores_checked_by)

  const { register, handleSubmit, reset } = useForm<SignOffInput>({
    resolver: zodResolver(signOffSchema),
    defaultValues: {
      production_checked_by:   jobCard.production_checked_by ?? "",
      production_checked_date: jobCard.production_checked_date ?? "",
      qc_checked_by:           jobCard.qc_checked_by ?? "",
      qc_checked_date:         jobCard.qc_checked_date ?? "",
      stores_checked_by:       jobCard.stores_checked_by ?? "",
      stores_checked_date:     jobCard.stores_checked_date ?? "",
    },
  })

  function openEdit() {
    reset({
      production_checked_by:   jobCard.production_checked_by ?? "",
      production_checked_date: jobCard.production_checked_date ?? "",
      qc_checked_by:           jobCard.qc_checked_by ?? "",
      qc_checked_date:         jobCard.qc_checked_date ?? "",
      stores_checked_by:       jobCard.stores_checked_by ?? "",
      stores_checked_date:     jobCard.stores_checked_date ?? "",
    })
    setEditOpen(true)
  }

  function onSubmit(data: SignOffInput) {
    startTransition(async () => {
      const result = await upsertSignOff(jobCard.id, data)
      if (result.error) {
        toast.error("Save failed", { description: result.error })
      } else {
        toast.success("Sign-off saved")
        setEditOpen(false)
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
              <ClipboardCheck className="h-4 w-4" /> Production Sign-Off
            </CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Pencil className="h-3 w-3 mr-1" /> Sign Off
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showProduction && (
            <SignRow
              label="Production Check"
              by={jobCard.production_checked_by}
              date={jobCard.production_checked_date}
            />
          )}
          {showQc && (
            <SignRow
              label="QC Check"
              by={jobCard.qc_checked_by}
              date={jobCard.qc_checked_date}
            />
          )}
          {showStores && (
            <SignRow
              label="Stores Check"
              by={jobCard.stores_checked_by}
              date={jobCard.stores_checked_date}
            />
          )}
          {!showProduction && !showQc && !showStores && (
            <p className="text-sm text-muted-foreground">No sign-offs recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => !v && setEditOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Production Sign-Off</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(userRole === "admin" || userRole === "engineer") && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Production</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Checked By</Label>
                    <Input {...register("production_checked_by")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" {...register("production_checked_date")} />
                  </div>
                </div>
              </div>
            )}
            {(userRole === "admin" || userRole === "qa") && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">QC</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Checked By</Label>
                    <Input {...register("qc_checked_by")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" {...register("qc_checked_date")} />
                  </div>
                </div>
              </div>
            )}
            {(userRole === "admin" || userRole === "accounts") && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stores</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Checked By</Label>
                    <Input {...register("stores_checked_by")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" {...register("stores_checked_date")} />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Sign-Off"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
