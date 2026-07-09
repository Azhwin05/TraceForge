import { requireAuth } from "@/lib/auth"
import { MachineListClient } from "@/components/master-data/machine-list-client"
import type { UserRole } from "@/types/database"

export default async function MachinesPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("machines")
    .select("*")
    .order("category", { ascending: true })
    .order("machine_code", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <MachineListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
