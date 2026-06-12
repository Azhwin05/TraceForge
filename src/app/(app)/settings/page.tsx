import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UsersClient } from "@/components/settings/users-client"
import type { Profile } from "@/types/database"

export const metadata = { title: "Settings — ValveTrack" }
export const revalidate = 60

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profiles }, { data: currentProfile }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ])

  const isAdmin = currentProfile?.role === "admin"

  return (
    <UsersClient
      profiles={(profiles ?? []) as Profile[]}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  )
}
