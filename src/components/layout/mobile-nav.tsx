"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { BrandLockup } from "./brand-lockup"
import { ModuleSwitcher, SidebarNav, resolveActiveModule } from "./app-sidebar"
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

  // Close on route change so tapping a link doesn't leave the drawer open
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // A drawer that scrolls the page behind it feels broken on touch
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-neutral-950/60 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col",
              "border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl",
              "animate-in slide-in-from-left-2 fade-in-0 duration-200"
            )}
          >
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <Link href="/home" className="min-w-0">
                <BrandLockup />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ModuleSwitcher
              activeModuleId={activeModule.id}
              onNavigate={() => setOpen(false)}
            />

            <SidebarNav
              role={role}
              alertCount={alertCount}
              onNavigate={() => setOpen(false)}
            />

            <div className="border-t border-sidebar-border px-4 py-3 text-2xs text-sidebar-muted/70">
              Raghav Engineering
            </div>
          </div>
        </>
      )}
    </div>
  )
}
