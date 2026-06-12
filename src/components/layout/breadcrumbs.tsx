"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "job-cards": "Job Cards",
  new: "New Job Card",
  "pwht-runs": "PWHT Runs",
  search: "Search",
  alerts: "Alerts",
  audit: "Audit Trail",
  settings: "Settings",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const label = UUID_RE.test(seg) ? "Detail" : (ROUTE_LABELS[seg] ?? seg)
    const isLast = i === segments.length - 1
    return { href, label, isLast }
  })

  if (crumbs.length <= 1) {
    return (
      <span className="text-sm font-semibold text-foreground">
        {crumbs[0]?.label ?? ""}
      </span>
    )
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {crumb.isLast ? (
            <span className="font-semibold text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
