import { requireAuth } from "@/lib/auth"
import { ItemMasterListClient } from "@/components/inventory/item-master-list-client"
import type { UserRole } from "@/types/database"

export default async function ItemMasterPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("item_master")
    .select("*")
    .order("item_code", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <ItemMasterListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
