import Link from "next/link"
import { ArrowRight, PackageSearch } from "lucide-react"
import { requireCustomer } from "@/lib/auth"
import { must } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-foreground tabular">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
          <CardAction>
            <Link
              href="/portal/jobs"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              compact
              icon={PackageSearch}
              title="No jobs on record yet"
              description="Once Raghav Engineering receives your first valve, its live status will appear here."
            />
          ) : (
            <div className="space-y-1.5">
              {jobs.slice(0, 8).map((j) => (
                <Link
                  key={j.id}
                  href={`/portal/jobs/${j.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-medium text-foreground">
                      {j.jc_number}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {j.description}
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadgeClass(j.status)}>
                    {STATUS_LABEL[j.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
