import { requireAuth } from "@/lib/auth"
import { ConsumableListClient } from "@/components/master-data/consumable-list-client"
import type { UserRole } from "@/types/database"

export default async function ConsumablesPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("consumable_master")
    .select("*")
    .order("brand", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <ConsumableListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
