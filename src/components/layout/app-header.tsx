"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Breadcrumbs } from "./breadcrumbs"
import { MobileNav } from "./mobile-nav"
import { SignOutButton } from "./sign-out-button"
import { ThemeToggle } from "./theme-toggle"
import { CommandPalette } from "./command-palette"
import type { UserRole } from "@/types/database"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function AppHeader({
  email,
  fullName,
  role,
  alertCount = 0,
}: {
  email: string
  fullName: string
  role: UserRole
  alertCount?: number
}) {
  const showAlerts = ["admin", "qa", "engineer", "accounts"].includes(role)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-3 backdrop-blur-md md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <MobileNav role={role} alertCount={alertCount} />
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="hidden sm:block">
          <CommandPalette role={role} />
        </div>

        {showAlerts && (
          <Link
            href="/alerts"
            aria-label={
              alertCount > 0 ? `Alerts, ${alertCount} unacknowledged` : "Alerts"
            }
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
            )}
          </Link>
        )}

        <ThemeToggle />

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex shrink-0 items-center gap-2.5 rounded-md p-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60">
            <Avatar>
              <AvatarFallback className="bg-brand-700 text-white dark:bg-brand-400">
                {initials(fullName) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight lg:block">
              <p className="max-w-[10rem] truncate text-xs font-medium text-foreground">
                {fullName}
              </p>
              <p className="text-2xs capitalize text-muted-foreground">{role}</p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
                <p className="mt-1 inline-flex rounded-full border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium capitalize text-muted-foreground">
                  {role}
                </p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <SignOutButton />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
