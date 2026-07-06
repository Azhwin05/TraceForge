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
  Users,
  PackageCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  /** Roles that can see this item. Omit = visible to all. */
  roles?: UserRole[]
  badgeKey?: string
}

type NavGroup = {
  heading?: string
  items: NavItem[]
  /** Roles that can see this group. Omit = visible to all. */
  roles?: UserRole[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/job-cards", label: "Job Cards", icon: ClipboardList },
      { href: "/pwht-runs", label: "PWHT Runs", icon: Flame },
      { href: "/search",    label: "Search",    icon: Search },
      {
        href: "/alerts",
        label: "Alerts",
        icon: Bell,
        badgeKey: "alerts",
        // operators and management don't have actionable alerts
        roles: ["admin", "qa", "engineer", "accounts"],
      },
    ],
  },
  {
    heading: "Master Data",
    // Only admin and qa manage master data
    roles: ["admin", "qa"],
    items: [
      { href: "/master-data/wps",         label: "WPS Master",  icon: FileText     },
      { href: "/master-data/consumables", label: "Consumables", icon: Package      },
      { href: "/master-data/chemicals",   label: "Chemicals",   icon: FlaskConical },
      { href: "/master-data/instruments", label: "Instruments", icon: Gauge        },
    ],
  },
  {
    heading: "Reports",
    items: [
      { href: "/pmi-reports",       label: "PMI Reports",       icon: Microscope },
      { href: "/dimension-reports", label: "Dimension Reports", icon: Ruler      },
      { href: "/overlay-reports",   label: "Overlay Reports",   icon: Layers     },
      { href: "/documents",         label: "Document Center",   icon: FolderOpen },
      {
        href: "/dossiers",
        label: "Dossiers",
        icon: PackageCheck,
        roles: ["admin", "qa"],
      },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/audit",    label: "Audit Trail", icon: History },
      {
        href: "/portal-users",
        label: "Portal Users",
        icon: Users,
        roles: ["admin"],
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
]

function canSee(requiredRoles: UserRole[] | undefined, userRole: UserRole): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true
  return requiredRoles.includes(userRole)
}

export function AppSidebar({
  role,
  alertCount = 0,
}: {
  role: UserRole
  alertCount?: number
}) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 flex-col bg-brand-sidebar text-white md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-sm font-bold shrink-0">
          VT
        </div>
        <span className="text-base font-semibold tracking-tight">ValveTrack</span>
      </div>

      {/* Role badge */}
      <div className="px-5 pt-3 pb-1">
        <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">
          {role}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {NAV_GROUPS.map((group, gi) => {
          if (!canSee(group.roles, role)) return null
          const visibleItems = group.items.filter((item) => canSee(item.roles, role))
          if (visibleItems.length === 0) return null

          return (
            <div key={gi}>
              {group.heading && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon, badgeKey }) => {
                  const active =
                    href === "/dashboard"
                      ? pathname === href
                      : pathname === href || pathname.startsWith(href + "/")
                  const showBadge = badgeKey === "alerts" && alertCount > 0

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
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-white" : "text-white/60"
                        )}
                      />
                      <span className="flex-1">{label}</span>
                      {showBadge && (
                        <span className="flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                          {alertCount > 99 ? "99+" : alertCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
        Raghav Engineering
      </div>
    </aside>
  )
}
