"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  Flame,
  Bell,
  History,
  Settings,
  FileText,
  FlaskConical,
  Gauge,
  Package,
  Microscope,
  Ruler,
  Layers,
  FolderOpen,
  PackageCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavGroup = { heading?: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
      { href: "/job-cards",  label: "Job Cards",  icon: ClipboardList },
      { href: "/pwht-runs",  label: "PWHT Runs",  icon: Flame },
      { href: "/search",     label: "Search",     icon: Search },
      { href: "/alerts",     label: "Alerts",     icon: Bell },
    ],
  },
  {
    heading: "Master Data",
    items: [
      { href: "/master-data/wps",          label: "WPS Master",   icon: FileText     },
      { href: "/master-data/consumables",  label: "Consumables",  icon: Package      },
      { href: "/master-data/chemicals",    label: "Chemicals",    icon: FlaskConical },
      { href: "/master-data/instruments",  label: "Instruments",  icon: Gauge        },
    ],
  },
  {
    heading: "Reports",
    items: [
      { href: "/pmi-reports",       label: "PMI Reports",       icon: Microscope },
      { href: "/dimension-reports", label: "Dimension Reports", icon: Ruler      },
      { href: "/overlay-reports",   label: "Overlay Reports",   icon: Layers     },
      { href: "/documents",          label: "Document Center",   icon: FolderOpen   },
      { href: "/dossiers",           label: "Dossiers",          icon: PackageCheck },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/audit",    label: "Audit Trail", icon: History },
      { href: "/settings", label: "Settings",    icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 flex-col bg-brand-sidebar text-white md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-sm font-bold shrink-0">
          VT
        </div>
        <span className="text-base font-semibold tracking-tight">ValveTrack</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {group.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/dashboard"
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/15 text-white font-medium"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-white/60")} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
        Raghav Engineering
      </div>
    </aside>
  )
}
