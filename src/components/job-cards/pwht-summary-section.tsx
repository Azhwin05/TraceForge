import { Flame, CheckCircle, XCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PwhtRunJobWithRun } from "@/types/database"

const RESULT_CONFIG = {
  pass:    { label: "Pass",    icon: CheckCircle, className: "text-green-600" },
  fail:    { label: "Fail",    icon: XCircle,     className: "text-destructive" },
  pending: { label: "Pending", icon: Clock,       className: "text-amber-500" },
}

const COOLING_LABELS: Record<string, string> = {
  air:        "Air",
  furnace:    "Furnace",
  controlled: "Controlled",
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function PwhtSummarySection({
  pwhtJobs,
  pwhtRequired,
}: {
  pwhtJobs: PwhtRunJobWithRun[]
  pwhtRequired?: boolean
}) {
  if (pwhtJobs.length === 0 && !pwhtRequired) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4" /> PWHT Summary
          {pwhtRequired && pwhtJobs.length === 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs ml-2">
              Required — Pending
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pwhtJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            PWHT required by WPS — no run linked yet.
          </p>
        ) : (
          pwhtJobs.map((job) => {
            const run = job.pwht_run
            const result = (run.pwht_result ?? "pending") as keyof typeof RESULT_CONFIG
            const cfg = RESULT_CONFIG[result] ?? RESULT_CONFIG.pending
            const Icon = cfg.icon
            return (
              <div key={job.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium font-mono">{run.chart_number}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                    {job.is_final && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground text-[10px]">Final</span>}
                  </span>
                </div>
                <div className="space-y-1">
                  <Row label="Furnace ID"       value={run.furnace_id} />
                  <Row label="Date of Cycle"    value={new Date(run.date_of_cycle).toLocaleDateString("en-IN")} />
                  <Row label="Loading Temp"     value={`${run.loading_temp}°C`} />
                  <Row label="Soaking Temp"     value={`${run.soaking_temp}°C`} />
                  <Row label="Soaking Time"     value={`${run.soaking_time} min`} />
                  <Row label="Unloading Temp"   value={run.unloading_temp != null ? `${run.unloading_temp}°C` : null} />
                  <Row label="Cooling Method"   value={run.cooling_method ? COOLING_LABELS[run.cooling_method] : null} />
                  <Row label="Operator"         value={run.operator_name} />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
