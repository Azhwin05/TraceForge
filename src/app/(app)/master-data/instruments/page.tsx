import { requireAuth } from "@/lib/auth"
import { InstrumentListClient } from "@/components/master-data/instrument-list-client"
import type { UserRole } from "@/types/database"

export default async function InstrumentsPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("instrument_master")
    .select("*")
    .order("instrument_name", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <InstrumentListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
