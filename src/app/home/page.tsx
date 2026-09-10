import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardList, Warehouse, ArrowRight } from "lucide-react"

import { requireAuth } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SignOutButton } from "@/components/layout/sign-out-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

const MODULES = [
  {
    href: "/dashboard",
    label: "Job Tracker",
    description:
      "Job cards, PWHT runs, inspection reports, master data and alerts.",
    icon: ClipboardList,
    points: ["Job cards & stage gates", "PMI / dimension / overlay", "Dossiers & dispatch"],
  },
  {
    href: "/inventory",
    label: "Inventory",
    description:
      "Stock value, material inward, GRN inspection, issues and transfers.",
    icon: Warehouse,
    points: ["Material inward & GRN", "Stock balances by location", "Issues, returns & transfers"],
  },
]

export default async function HomePage() {
  const { user, profile } = await requireAuth()

  // /home lives outside the (app) route group, so the customer guard in
  // (app)/layout.tsx never runs here — without this, an external portal
  // customer lands on the internal module picker after signing in.
  if (profile.role === "customer") redirect("/portal")

  const fullName = profile.full_name ?? user.email ?? "User"
  const firstName = fullName.split(" ")[0]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            VT
          </span>
          <span className="text-base font-semibold tracking-tight">ValveTrack</span>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md p-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60">
              <Avatar>
                <AvatarFallback className="bg-brand-700 text-white dark:bg-brand-400">
                  {initials(fullName) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <p className="max-w-[10rem] truncate text-xs font-medium text-foreground">
                  {fullName}
                </p>
                <p className="text-2xs capitalize text-muted-foreground">{profile.role}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
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

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose a module to continue.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MODULES.map(({ href, label, description, icon: Icon, points }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-700 transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground dark:text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>

                <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  {label}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                  {points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        aria-hidden
                        className="h-1 w-1 shrink-0 rounded-full bg-border-strong"
                      />
                      {p}
                    </li>
                  ))}
                </ul>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-600">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
