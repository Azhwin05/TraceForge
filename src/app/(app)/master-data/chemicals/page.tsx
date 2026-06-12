import { requireAuth } from "@/lib/auth"
import { ChemicalListClient } from "@/components/master-data/chemical-list-client"
import type { UserRole } from "@/types/database"

export default async function ChemicalsPage() {
  const { supabase, profile } = await requireAuth()

  const { data: records } = await supabase
    .from("chemical_master")
    .select("*")
    .order("chemical_name", { ascending: true })

  const userRole = (profile?.role ?? "operator") as UserRole

  return (
    <div className="p-6">
      <ChemicalListClient records={records ?? []} userRole={userRole} />
    </div>
  )
}
