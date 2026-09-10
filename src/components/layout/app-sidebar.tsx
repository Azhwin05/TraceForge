"use client"

import * as React from "react"
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
  Wrench,
  Send,
  Truck,
  Warehouse,
  FileBarChart,
  Boxes,
  ArrowRightLeft,
  MapPin,
  Wallet,
  Trash2,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
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
          { href: "/search", label: "Search", icon: Search },
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
          { href: "/master-data/wps", label: "WPS Master", icon: FileText, roles: ["admin", "qa"] },
          { href: "/master-data/consumables", label: "Consumables", icon: Package, roles: ["admin", "qa"] },
          { href: "/master-data/chemicals", label: "Chemicals", icon: FlaskConical, roles: ["admin", "qa"] },
          { href: "/master-data/instruments", label: "Instruments", icon: Gauge, roles: ["admin", "qa"] },
          { href: "/master-data/machines", label: "Machines", icon: Cog, roles: ["admin", "engineer"] },
        ],
      },
      {
        heading: "Reports",
        items: [
          { href: "/pmi-reports", label: "PMI Reports", icon: Microscope },
          { href: "/dimension-reports", label: "Dimension Reports", icon: Ruler },
          { href: "/overlay-reports", label: "Overlay Reports", icon: Layers },
          { href: "/rework", label: "Rework", icon: Wrench },
          { href: "/documents", label: "Document Center", icon: FolderOpen },
          { href: "/client-documents", label: "Client Documents", icon: Send, roles: ["admin"] },
          { href: "/dossiers", label: "Dossiers", icon: PackageCheck, roles: ["admin", "qa"] },
        ],
      },
      {
        heading: "System",
        items: [
          { href: "/audit", label: "Audit Trail", icon: History },
          { href: "/job-cards/recycle-bin", label: "Recycle Bin", icon: Trash2, roles: ["admin"] },
          { href: "/portal-users", label: "Portal Users", icon: Users, roles: ["admin"] },
          { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
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
          { href: "/inventory", label: "Dashboard", icon: Wallet },
          { href: "/inventory/material-inward", label: "Material Inward", icon: Truck },
          { href: "/inventory/stock", label: "Stock Balances", icon: Warehouse },
          { href: "/inventory/material-issues", label: "Material Issues", icon: ArrowRightLeft },
          { href: "/inventory/reports", label: "Material Report", icon: FileBarChart },
        ],
      },
      {
        heading: "Masters",
        roles: ["admin", "engineer"],
        items: [
          { href: "/inventory/items", label: "Item Master", icon: Boxes },
          { href: "/inventory/suppliers", label: "Suppliers", icon: Users },
          { href: "/inventory/locations", label: "Storage Locations", icon: MapPin },
          { href: "/inventory/customers", label: "Customers", icon: Building2 },
          { href: "/inventory/customers/recycle-bin", label: "Recycle Bin", icon: Trash2, roles: ["admin"] },
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

/**
 * Shared by desktop and mobile nav. Module index pages (/dashboard, /inventory)
 * are prefixes of their siblings, so they match exactly; everything else also
 * matches descendants, but only on a "/" boundary so /job-cards does not light
 * up for /job-cards-archive.
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard" || href === "/inventory") return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

const STORAGE_KEY = "vt:sidebar-collapsed"

export function ModuleSwitcher({
  activeModuleId,
  collapsed,
  onNavigate,
}: {
  activeModuleId: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <div
      className={cn(
        "flex gap-1 border-b border-sidebar-border px-3 py-3",
        collapsed ? "flex-col items-center" : "items-center"
      )}
    >
      {MODULES.map((mod) => {
        const isActive = mod.id === activeModuleId
        return (
          <Link
            key={mod.id}
            href={mod.defaultHref}
            onClick={onNavigate}
            title={collapsed ? mod.label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-120",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed ? "h-8 w-8" : "h-7 flex-1 px-2.5",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            )}
          >
            <mod.icon className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span className="truncate">{mod.label}</span>}
          </Link>
        )
      })}
    </div>
  )
}

export function SidebarNav({
  role,
  alertCount,
  collapsed,
  onNavigate,
}: {
  role: UserRole
  alertCount: number
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const activeModule = resolveActiveModule(pathname)

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
      {activeModule.groups.map((group, gi) => {
        if (!canSee(group.roles, role)) return null
        const visibleItems = group.items.filter((item) => canSee(item.roles, role))
        if (visibleItems.length === 0) return null

        return (
          <div key={gi}>
            {group.heading &&
              (collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
              ) : (
                <p className="mb-1.5 px-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-sidebar-muted/70">
                  {group.heading}
                </p>
              ))}

            <div className="space-y-0.5">
              {visibleItems.map(({ href, label, icon: Icon, badgeKey }) => {
                const active = isRouteActive(pathname, href)
                const showBadge = badgeKey === "alerts" && alertCount > 0

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center rounded-md text-sm transition-colors duration-120",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                      collapsed ? "h-9 w-9 justify-center" : "gap-3 px-2.5 py-2",
                      active
                        ? "bg-sidebar-foreground/10 font-medium text-sidebar-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground"
                    )}
                  >
                    {/* Accent rail marks the active route without repainting the row */}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-sidebar-accent"
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                      )}
                    />
                    {!collapsed && <span className="flex-1 truncate">{label}</span>}
                    {showBadge && (
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-full bg-danger font-semibold leading-none text-white",
                          collapsed
                            ? "absolute right-1 top-1 h-1.5 w-1.5"
                            : "h-4 min-w-[1rem] px-1 text-2xs"
                        )}
                      >
                        {!collapsed && (alertCount > 99 ? "99+" : alertCount)}
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
  )
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
  const [collapsed, setCollapsed] = React.useState(false)

  // Read persisted state after mount — localStorage is unavailable during SSR,
  // and reading it in useState would desync server and client markup.
  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1")
    } catch {
      /* private mode / storage disabled — default to expanded */
    }
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* non-fatal: the toggle still works for this session */
      }
      return next
    })
  }

  return (
    <aside
      data-collapsed={collapsed ? "" : undefined}
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      <Link
        href="/home"
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-sidebar-border transition-colors hover:bg-sidebar-foreground/5",
          collapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground">
          VT
        </span>
        {!collapsed && (
          <span className="truncate text-base font-semibold tracking-tight">ValveTrack</span>
        )}
      </Link>

      <ModuleSwitcher activeModuleId={activeModule.id} collapsed={collapsed} />

      <SidebarNav role={role} alertCount={alertCount} collapsed={collapsed} />

      <div
        className={cn(
          "flex items-center gap-2 border-t border-sidebar-border px-3 py-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="truncate text-2xs text-sidebar-muted/70">Raghav Engineering</span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
