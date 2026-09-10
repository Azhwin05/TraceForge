import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { JobCardFullForm } from "@/components/job-cards/job-card-full-form"
import type { Client } from "@/types/database"

export const metadata = { title: "New Job Card — ValveTrack" }

export default async function NewJobCardPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("name")

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link
          href="/job-cards"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Job Cards
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Job Card</h1>
        <p className="text-sm text-muted-foreground mt-1">
          JC number will be auto-assigned (e.g. RRE-2025-0001)
        </p>
      </div>

      <JobCardFullForm initialClients={(clients ?? []) as Client[]} />
    </div>
  )
}
