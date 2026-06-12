"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { approveWpsMaster, supersedeWpsMaster } from "@/app/(app)/master-data/wps/actions"

export function WpsApproveActions({
  wpsId,
  canApprove,
  canSupersede,
}: {
  wpsId: string
  canApprove: boolean
  canSupersede: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveWpsMaster(wpsId)
      if (result.error) {
        toast.error("Approval failed", { description: result.error })
      } else {
        toast.success("WPS Master approved")
        router.refresh()
      }
    })
  }

  function handleSupersede() {
    startTransition(async () => {
      const result = await supersedeWpsMaster(wpsId)
      if (result.error) {
        toast.error("Failed", { description: result.error })
      } else {
        toast.success("WPS Master marked as superseded")
        router.refresh()
      }
    })
  }

  return (
    <>
      {canApprove && (
        <Button size="sm" onClick={handleApprove} disabled={isPending}>
          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Approving…" : "Approve"}
        </Button>
      )}
      {canSupersede && (
        <Button size="sm" variant="outline" onClick={handleSupersede} disabled={isPending}>
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Superseding…" : "Mark Superseded"}
        </Button>
      )}
    </>
  )
}
