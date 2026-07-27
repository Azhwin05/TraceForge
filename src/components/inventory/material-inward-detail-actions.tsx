"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import { deleteMaterialInward } from "@/app/(app)/inventory/material-inward/actions"

export function MaterialInwardDetailActions({ id, inwardNumber }: { id: string; inwardNumber: string }) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Link href={`/inventory/material-inward/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      <InventoryRowActions
        label={inwardNumber}
        canDelete
        onDelete={async () => {
          const res = await deleteMaterialInward(id)
          if (!res.error) router.push("/inventory/material-inward")
          return res
        }}
        deleteDescription="This permanently removes the delivery-challan record and its inspections. Blocked if a GRN has already been generated (material already moved into stock) — cancel/reverse that first."
      />
    </div>
  )
}
