"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function PortalHeaderActions({ name }: { name: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-muted-foreground sm:inline">{name}</span>
      <button
        onClick={signOut}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </div>
  )
}
