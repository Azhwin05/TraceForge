"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODULES, resolveActiveModule, canSee } from "./app-sidebar"
import type { UserRole } from "@/types/database"

export function MobileNav({
  role,
  alertCount = 0,
}: {
  role: UserRole
  alertCount?: number
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const activeModule = resolveActiveModule(pathname)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-sidebar text-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Link
                href="/home"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-sm font-bold shrink-0">
                  VT
                </div>
                <span className="text-base font-semibold tracking-tight">
                  ValveTrack
                </span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-white/60 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Module switcher */}
            <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
              {MODULES.map((mod) => {
                const isActive = mod.id === activeModule.id
                return (
                  <Link
                    key={mod.id}
                    href={mod.defaultHref}
                    onClick={() => setOpen(false)}
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

            <nav className="flex-1 overflow-y-auto space-y-4 px-3 py-4">
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
                        const active =
                          pathname === href ||
                          (href !== "/dashboard" && pathname.startsWith(href))
                        const showBadge = badgeKey === "alerts" && alertCount > 0

                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
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
          </div>
        </>
      )}
    </div>
  )
}
