import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { MaterialInwardForm } from "@/components/inventory/material-inward-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function NewMaterialInwardPage() {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "operator", "engineer"].includes(profile?.role ?? "")) {
    redirect("/inventory/material-inward")
  }

  const [{ data: suppliers }, { data: items }] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).eq("approval_status", "approved").order("name"),
    supabase.from("item_master").select("id, item_code, item_name, uom").eq("is_active", true).eq("approval_status", "approved").order("item_code"),
  ])

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/inventory/material-inward" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Material Inward
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">New Material Inward</h1>
      <MaterialInwardForm suppliers={suppliers ?? []} items={items ?? []} />
    </div>
  )
}
