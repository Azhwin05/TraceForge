import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ItemMasterForm } from "@/components/inventory/item-master-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function NewItemMasterPage() {
  const { profile } = await requireAuth()

  if (!["admin", "engineer"].includes(profile?.role ?? "")) {
    redirect("/inventory/items")
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/inventory/items" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Items
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">New Item</h1>
      <ItemMasterForm mode="create" />
    </div>
  )
}
