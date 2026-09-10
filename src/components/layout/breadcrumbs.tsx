"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The previous map covered 8 of ~40 routes, so most pages showed raw slugs
 * ("material-inward"). Unmapped segments now fall back to title case rather
 * than leaking the URL.
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "job-cards": "Job Cards",
  "pwht-runs": "PWHT Runs",
  "pmi-reports": "PMI Reports",
  "dimension-reports": "Dimension Reports",
  "overlay-reports": "Overlay Reports",
  "client-documents": "Client Documents",
  "portal-users": "Portal Users",
  "master-data": "Master Data",
  "material-inward": "Material Inward",
  "material-issues": "Material Issues",
  "recycle-bin": "Recycle Bin",
  wps: "WPS",
  qa: "QA",
  nde: "NDE",
  search: "Search",
  alerts: "Alerts",
  audit: "Audit Trail",
  settings: "Settings",
  inventory: "Inventory",
  items: "Item Master",
  suppliers: "Suppliers",
  locations: "Storage Locations",
  customers: "Customers",
  stock: "Stock Balances",
  reports: "Material Report",
  documents: "Documents",
  dossiers: "Dossiers",
  rework: "Rework",
  chemicals: "Chemicals",
  consumables: "Consumables",
  instruments: "Instruments",
  machines: "Machines",
  traveller: "Travel Card",
  new: "New",
  edit: "Edit",
  portal: "Portal",
  jobs: "Jobs",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function labelFor(segment: string) {
  if (UUID_RE.test(segment)) return "Detail"
  const known = ROUTE_LABELS[segment]
  if (known) return known
  return segment
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((seg, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: labelFor(seg),
    isLast: i === segments.length - 1,
  }))

  if (crumbs.length === 0) return null

  if (crumbs.length === 1) {
    return (
      <span className="truncate text-sm font-semibold text-foreground">
        {crumbs[0].label}
      </span>
    )
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        // Intermediate crumbs are noise on narrow screens; the trail collapses
        // to just the current page. The chevron hides with its crumb so no
        // orphaned separators are left behind.
        <span
          key={crumb.href}
          className={cn(
            "min-w-0 items-center gap-1",
            crumb.isLast ? "flex" : "hidden sm:flex"
          )}
        >
          {i > 0 && (
            <ChevronRight
              aria-hidden
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground/60",
                crumb.isLast && "hidden sm:block"
              )}
            />
          )}
          {crumb.isLast ? (
            <span aria-current="page" className="truncate font-semibold text-foreground">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
