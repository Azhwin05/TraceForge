import { requireAuth } from "@/lib/auth"
import { WpsListClient } from "@/components/master-data/wps-list-client"
import type { WpsMaster, UserRole } from "@/types/database"

export const metadata = { title: "WPS Master — ValveTrack" }
export const revalidate = 60

export default async function WpsMasterPage() {
  const { supabase, profile } = await requireAuth()

  const { data } = await supabase
    .from("wps_master")
    .select("*")
    .order("wps_no", { ascending: true })

  return (
    <WpsListClient
      wpsRecords={(data ?? []) as WpsMaster[]}
      userRole={(profile?.role ?? "operator") as UserRole}
    />
  )
}
