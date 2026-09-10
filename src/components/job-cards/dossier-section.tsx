import Link from "next/link"
import { PackageCheck, Plus, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { UserRole, DossierStatus } from "@/types/database"

const STATUS_BADGE: Record<DossierStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-muted text-foreground" },
  generated: { label: "Generated", className: "bg-info-surface text-info" },
  submitted: { label: "Submitted", className: "bg-success-surface text-success" },
  archived:  { label: "Archived",  className: "bg-danger-surface text-danger" },
}

type DossierSummary = {
  id: string
  dossier_number: string
  dossier_date: string
  status: DossierStatus
  submitted_to_customer: boolean
  submitted_at: string | null
}

type Props = {
  jobCardId: string
  userRole: UserRole
  dossiers: DossierSummary[]
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function DossierSection({ jobCardId, userRole, dossiers }: Props) {
  const canCreate = ["admin", "qa"].includes(userRole)
  const visibleDossiers = dossiers.filter((d) => d.status !== "archived")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PackageCheck className="h-4 w-4" /> Customer Submission Dossiers
            {visibleDossiers.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({visibleDossiers.length})</span>
            )}
          </CardTitle>
          {canCreate && (
            <Link
              href={`/dossiers/new?job_card_id=${jobCardId}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> New Dossier
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visibleDossiers.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No dossiers created yet.
            {canCreate && (
              <span> <Link href={`/dossiers/new?job_card_id=${jobCardId}`} className="text-primary hover:underline">Create one</Link>.</span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleDossiers.map((d) => {
              const badge = STATUS_BADGE[d.status]
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono">{d.dossier_number}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", badge.className)}>
                        {badge.label}
                      </span>
                      {d.submitted_to_customer && (
                        <span className="text-xs text-success">✓ Submitted</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(d.dossier_date)}
                      {d.submitted_at && ` · Submitted ${fmtDate(d.submitted_at)}`}
                    </p>
                  </div>
                  <Link
                    href={`/dossiers/${d.id}`}
                    className="flex items-center gap-0.5 text-xs text-primary hover:underline shrink-0"
                  >
                    View <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
