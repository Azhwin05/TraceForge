import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { RecycleBinClient, type DeletedJobCard } from "@/components/job-cards/recycle-bin-client"

export const metadata = { title: "Recycle Bin — ValveTrack" }

export default async function RecycleBinPage() {
  const { supabase, profile } = await requireAuth()
  if (profile.role !== "admin") redirect("/job-cards")

  const { data } = await supabase
    .from("job_cards")
    .select("id, jc_number, description, status, deleted_at, purge_at, client:clients(name), deleter:profiles!deleted_by(full_name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  return (
    <div className="p-6">
      <RecycleBinClient jobCards={(data ?? []) as unknown as DeletedJobCard[]} />
    </div>
  )
}
