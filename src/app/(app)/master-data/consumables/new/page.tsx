import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ConsumableForm } from "@/components/master-data/consumable-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function NewConsumablePage() {
  const { profile } = await requireAuth()

  if (!["admin", "engineer"].includes(profile?.role ?? "")) {
    redirect("/master-data/consumables")
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/master-data/consumables"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Consumables
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">New Consumable</h1>
      <ConsumableForm mode="create" />
    </div>
  )
}
