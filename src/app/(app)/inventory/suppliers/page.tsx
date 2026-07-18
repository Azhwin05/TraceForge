import { requireAuth } from "@/lib/auth"
import { SupplierListClient } from "@/components/inventory/supplier-list-client"
import type { UserRole } from "@/types/database"

export default async function SuppliersPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <SupplierListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
