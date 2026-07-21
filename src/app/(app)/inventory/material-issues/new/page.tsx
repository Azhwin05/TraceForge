import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { MaterialIssueForm } from "@/components/inventory/material-issue-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function NewMaterialIssuePage() {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "operator", "engineer"].includes(profile?.role ?? "")) {
    redirect("/inventory/material-issues")
  }

  const [{ data: items }, { data: locations }, { data: jobCards }] = await Promise.all([
    supabase.from("item_master").select("id, item_code, item_name, uom").eq("is_active", true).eq("approval_status", "approved").order("item_code"),
    supabase.from("storage_locations").select("id, code, name").eq("is_active", true).order("code"),
    supabase.from("job_cards").select("id, jc_number").order("created_at", { ascending: false }).limit(100),
  ])

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/inventory/material-issues" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Material Issues
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">New Material Issue</h1>
      <MaterialIssueForm items={items ?? []} storageLocations={locations ?? []} jobCards={jobCards ?? []} />
    </div>
  )
}
