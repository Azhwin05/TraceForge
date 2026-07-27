import Link from "next/link"
import { requireCustomer } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABEL, statusBadgeClass } from "@/lib/portal/status"
import type { JobCardStatus } from "@/types/database"

export const metadata = { title: "My Jobs — ValveTrack" }

type JobRow = {
  id: string; jc_number: string; description: string; status: JobCardStatus
  received_date: string; po_number: string | null; drawing_number: string | null
}

export default async function PortalJobs() {
  const { supabase } = await requireCustomer()

  const { data: jobsRaw } = await supabase
    .from("job_cards")
    .select("id, jc_number, description, status, received_date, po_number, drawing_number")
    .is("deleted_at", null)
    .order("received_date", { ascending: false })

  const jobs = (jobsRaw ?? []) as JobRow[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Jobs</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Job Card</th>
                <th className="p-3">Description</th>
                <th className="p-3">PO Number</th>
                <th className="p-3">Received</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No jobs on record.</td></tr>
              )}
              {jobs.map((j) => (
                <tr key={j.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3">
                    <Link href={`/portal/jobs/${j.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                      {j.jc_number}
                    </Link>
                  </td>
                  <td className="p-3 max-w-xs truncate">{j.description}</td>
                  <td className="p-3">{j.po_number ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(j.received_date).toLocaleDateString()}</td>
                  <td className="p-3"><Badge className={statusBadgeClass(j.status)}>{STATUS_LABEL[j.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
