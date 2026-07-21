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
  Cog,
  Package,
  Microscope,
  Ruler,
  Layers,
  FolderOpen,
  Users,
  PackageCheck,
  Truck,
  Warehouse,
  Boxes,
  ArrowRightLeft,
  MapPin,
  Wallet,
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

export type Module = {
  id: string
  label: string
  icon: React.ElementType
  /** Path prefix used to detect this module from the current URL. */
  pathPrefix: string
  /** Default page to land on when switching into this module. */
  defaultHref: string
  groups: NavGroup[]
}

export const MODULES: Module[] = [
  {
    id: "job-tracker",
    label: "Job Tracker",
    icon: ClipboardList,
    pathPrefix: "", // fallback module: matches anything not claimed by another module's prefix
    defaultHref: "/dashboard",
    groups: [
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
        // admin + qa manage inspection/consumable masters; engineer manages machines
        roles: ["admin", "qa", "engineer"],
        items: [
          { href: "/master-data/wps",         label: "WPS Master",  icon: FileText,     roles: ["admin", "qa"] },
          { href: "/master-data/consumables", label: "Consumables", icon: Package,      roles: ["admin", "qa"] },
          { href: "/master-data/chemicals",   label: "Chemicals",   icon: FlaskConical, roles: ["admin", "qa"] },
          { href: "/master-data/instruments", label: "Instruments", icon: Gauge,        roles: ["admin", "qa"] },
          { href: "/master-data/machines",    label: "Machines",    icon: Cog,          roles: ["admin", "engineer"] },
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
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Warehouse,
    pathPrefix: "/inventory",
    defaultHref: "/inventory",
    groups: [
      {
        items: [
          { href: "/inventory",                 label: "Dashboard",       icon: Wallet },
          { href: "/inventory/material-inward", label: "Material Inward", icon: Truck },
          { href: "/inventory/stock",           label: "Stock Balances",  icon: Warehouse },
          { href: "/inventory/material-issues", label: "Material Issues", icon: ArrowRightLeft },
        ],
      },
      {
        heading: "Masters",
        roles: ["admin", "engineer"],
        items: [
          { href: "/inventory/items",     label: "Item Master",       icon: Boxes },
          { href: "/inventory/suppliers", label: "Suppliers",         icon: Users },
          { href: "/inventory/locations", label: "Storage Locations", icon: MapPin },
        ],
      },
    ],
  },
]

export function resolveActiveModule(pathname: string): Module {
  // Check specific (non-empty) prefixes first; the module with an empty
  // prefix is the fallback and must be tried last since "" matches everything.
  const specific = MODULES.find((m) => m.pathPrefix && pathname.startsWith(m.pathPrefix))
  return specific ?? MODULES.find((m) => !m.pathPrefix) ?? MODULES[0]
}

export function canSee(requiredRoles: UserRole[] | undefined, userRole: UserRole): boolean {
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
  const activeModule = resolveActiveModule(pathname)

  return (
    <aside className="hidden w-60 flex-col bg-brand-sidebar text-white md:flex">
      {/* Logo — click to return to the module hub */}
      <Link
        href="/home"
        className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5 transition-colors hover:bg-white/5"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-sm font-bold shrink-0">
          VT
        </div>
        <span className="text-base font-semibold tracking-tight">ValveTrack</span>
      </Link>

      {/* Module switcher */}
      <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
        {MODULES.map((mod) => {
          const isActive = mod.id === activeModule.id
          return (
            <Link
              key={mod.id}
              href={mod.defaultHref}
              title={mod.label}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-brand-accent text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
              )}
            >
              <mod.icon className="h-3.5 w-3.5" />
              {mod.label}
            </Link>
          )
        })}
      </div>

      {/* Role badge */}
      <div className="px-5 pt-3 pb-1">
        <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">
          {role}
        </span>
      </div>

      {/* Navigation — scoped to the active module */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {activeModule.groups.map((group, gi) => {
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
                  // Module index pages (/dashboard, /inventory) are prefixes of
                  // their siblings, so match them exactly to avoid staying lit.
                  const active =
                    href === "/dashboard" || href === "/inventory"
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
