"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { acknowledgeAlert } from "@/app/(app)/alerts/actions"
import type { JobCardWithRelations, JobCardStatus } from "@/types/database"

type AlertRow = {
  id: string
  job_card_id: string
  alert_type: string
  stage: string
  hours_overdue: number
  sent_at: string
  acknowledged_at: string | null
  acknowledged_by: string | null
}

type OverdueJob = JobCardWithRelations & { daysAtStage: number }

export function AlertsClient({
  overdueJobs,
  dbAlerts,
}: {
  overdueJobs: OverdueJob[]
  dbAlerts: AlertRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAcknowledge(alertId: string) {
    startTransition(async () => {
      const result = await acknowledgeAlert(alertId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Alert acknowledged")
        router.refresh()
      }
    })
  }

  const unacked = dbAlerts.filter((a) => !a.acknowledged_at)
  const acked = dbAlerts.filter((a) => a.acknowledged_at)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {overdueJobs.length} overdue job{overdueJobs.length !== 1 ? "s" : ""} · {unacked.length} unacknowledged alert{unacked.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Overdue / On Hold Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Overdue &amp; On Hold
            <span className="ml-auto text-sm font-normal text-muted-foreground">{overdueJobs.length} job{overdueJobs.length !== 1 ? "s" : ""}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {overdueJobs.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              All jobs are on track — nothing overdue.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {overdueJobs.map((jc) => (
                <div key={jc.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      jc.status === "on_hold" ? "bg-danger-surface text-danger" : "bg-warning-surface text-warning"
                    }`}>
                      {jc.status === "on_hold" ? "!" : `${jc.daysAtStage}d`}
                    </div>
                    <div>
                      <Link href={`/job-cards/${jc.id}`} className="font-mono font-semibold text-sm text-brand-primary hover:underline">
                        {jc.jc_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{jc.client?.name} · {jc.description.slice(0, 60)}{jc.description.length > 60 ? "…" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <StatusBadge status={jc.status as JobCardStatus} />
                    {jc.status !== "on_hold" && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {jc.daysAtStage} day{jc.daysAtStage !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DB Alerts - Unacknowledged */}
      {unacked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Unacknowledged Alerts
              <span className="ml-auto text-sm font-normal text-muted-foreground">{unacked.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {unacked.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{alert.alert_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Stage: {alert.stage} · {Math.round(alert.hours_overdue)}h overdue · {new Date(alert.sent_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/job-cards/${alert.job_card_id}`} className="text-xs text-brand-primary hover:underline">
                      View Job
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DB Alerts - Acknowledged */}
      {acked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Acknowledged Alerts
              <span className="ml-auto text-sm font-normal text-muted-foreground">{acked.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {acked.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between py-3 opacity-60">
                  <div>
                    <p className="text-sm">{alert.alert_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Stage: {alert.stage} · Acknowledged {new Date(alert.acknowledged_at!).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {overdueJobs.length === 0 && dbAlerts.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
            <p className="text-muted-foreground">No alerts — everything is running smoothly.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
