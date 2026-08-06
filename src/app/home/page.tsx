import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardList, Warehouse } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SignOutButton } from "@/components/layout/sign-out-button"
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
    description: "Job cards, PWHT runs, reports, master data & alerts",
    icon: ClipboardList,
  },
  {
    href: "/inventory",
    label: "Inventory",
    description: "Stock value, material inward, inspection, GRN & issues",
    icon: Warehouse,
  },
]

export default async function HomePage() {
  const { user, profile } = await requireAuth()

  // /home lives outside the (app) route group, so the customer guard in
  // (app)/layout.tsx never runs here — without this, an external portal
  // customer lands on the internal module picker after signing in.
  if (profile.role === "customer") redirect("/portal")

  const fullName = profile.full_name ?? user.email ?? "User"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold text-white">
            VT
          </div>
          <span className="text-base font-semibold tracking-tight">ValveTrack</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-secondary">
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-medium text-foreground">{fullName}</p>
              <p className="capitalize text-muted-foreground">{profile.role}</p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-brand-primary text-white">
                {initials(fullName) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <SignOutButton />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to ValveTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select a module to continue</p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
          {MODULES.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white">
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
