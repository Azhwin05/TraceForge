import Link from "next/link"
import { Plus } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"
import { MaterialInwardListClient } from "@/components/inventory/material-inward-list-client"

export default async function MaterialInwardPage() {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole
  const canCreate = ["admin", "operator", "engineer"].includes(userRole)

  const { data: records } = await supabase
    .from("material_inward")
    .select("*, suppliers(name), clients(name)")
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Material Inward</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery challan receipts → inspection → GRN
          </p>
        </div>
        {canCreate && (
          <Link href="/inventory/material-inward/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Material Inward
          </Link>
        )}
      </div>

      <MaterialInwardListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
