"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/jobs", label: "My Jobs" },
  { href: "/portal/documents", label: "Documents" },
]

export function PortalNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5" aria-label="Portal sections">
      {LINKS.map(({ href, label }) => {
        // "/portal" is a prefix of the others, so it must match exactly.
        const active =
          href === "/portal" ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors duration-120",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
