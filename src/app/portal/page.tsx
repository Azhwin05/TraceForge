import Link from "next/link"
import { requireCustomer } from "@/lib/auth"
import { must } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABEL, statusBadgeClass } from "@/lib/portal/status"
import type { JobCardStatus } from "@/types/database"

export const metadata = { title: "Portal Overview — ValveTrack" }

type JobRow = { id: string; jc_number: string; description: string; status: JobCardStatus; received_date: string }

export default async function PortalHome() {
  const { supabase } = await requireCustomer()

  // RLS scopes these rows to the customer's own client automatically.
  // must(): if this query fails, the customer must NOT be shown "Total Jobs: 0"
  // — a confident, wrong answer about their own work is worse than an error.
  const jobsRes = await supabase
    .from("job_cards")
    .select("id, jc_number, description, status, received_date")
    .is("deleted_at", null)
    .order("received_date", { ascending: false })

  const jobs = must(jobsRes, "your jobs") as JobRow[]

  const inProduction = jobs.filter((j) => ["process_assigned", "in_process", "process_complete"].includes(j.status)).length
  const inInspection = jobs.filter((j) => ["reports_pending", "reports_complete"].includes(j.status)).length
  const dispatched = jobs.filter((j) => ["dispatched", "accounts_processing"].includes(j.status)).length
  const completed = jobs.filter((j) => j.status === "closed").length

  const cards = [
    { label: "Total Jobs", value: jobs.length },
    { label: "In Production", value: inProduction },
    { label: "In Inspection", value: inInspection },
    { label: "Dispatched", value: dispatched },
    { label: "Completed", value: completed },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Live status of all your jobs at Raghav Engineering.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="text-3xl font-semibold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent jobs</CardTitle>
          <Link href="/portal/jobs" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs on record yet.</p>
          ) : (
            <div className="divide-y">
              {jobs.slice(0, 8).map((j) => (
                <Link key={j.id} href={`/portal/jobs/${j.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded">
                  <div>
                    <div className="font-mono text-sm font-medium">{j.jc_number}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{j.description}</div>
                  </div>
                  <Badge className={statusBadgeClass(j.status)}>{STATUS_LABEL[j.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
