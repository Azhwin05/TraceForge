import { requireAuth } from "@/lib/auth"
import { StorageLocationListClient } from "@/components/inventory/storage-location-list-client"
import type { UserRole } from "@/types/database"

export default async function StorageLocationsPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("storage_locations")
    .select("*")
    .order("code", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <StorageLocationListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
