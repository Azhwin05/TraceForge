"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Tiny client island so the traveller page itself can stay a Server Component. */
export function PrintButton({ label = "Print Travel Card" }: { label?: string }) {
  return (
    <Button size="sm" onClick={() => window.print()} className="gap-1.5 print:hidden">
      <Printer className="h-4 w-4" /> {label}
    </Button>
  )
}
