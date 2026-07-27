import { requireAuth } from "@/lib/auth"
import { CustomerListClient, type CustomerRow } from "@/components/inventory/customer-list-client"
import type { UserRole } from "@/types/database"

export default async function CustomersPage() {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const { data: clients } = await supabase
    .from("clients")
    .select("*, customer_items(status, deleted_at)")
    .order("name", { ascending: true })

  return (
    <div className="p-6">
      <CustomerListClient records={(clients ?? []) as unknown as CustomerRow[]} userRole={userRole} />
    </div>
  )
}
