import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { CustomerDetailClient } from "@/components/inventory/customer-detail-client"
import type { UserRole } from "@/types/database"

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const { data: customer, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !customer) notFound()

  const { data: items } = await supabase
    .from("customer_items")
    .select("*")
    .eq("client_id", params.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/inventory/customers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Customers
        </Link>
      </div>
      <CustomerDetailClient customer={customer} items={items ?? []} userRole={userRole} />
    </div>
  )
}
