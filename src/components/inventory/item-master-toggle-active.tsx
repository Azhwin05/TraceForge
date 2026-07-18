"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toggleItemMasterActive } from "@/app/(app)/inventory/items/actions"

export function ItemMasterToggleActive({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setLoading(true)
    setError(null)
    const result = await toggleItemMasterActive(id, isActive)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-1">
      <Button variant={isActive ? "outline" : "default"} size="sm" disabled={loading} onClick={handleToggle}>
        {loading ? "Saving…" : isActive ? "Deactivate" : "Activate"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
