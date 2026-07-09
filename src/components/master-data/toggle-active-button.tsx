"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toggleMasterItemActive } from "@/app/(app)/master-data/actions"

type TogglableTable = "consumable_master" | "chemical_master" | "instrument_master" | "machines"

interface Props {
  table: TogglableTable
  id: string
  isActive: boolean
}

export function ToggleActiveButton({ table, id, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setLoading(true)
    setError(null)
    const result = await toggleMasterItemActive(table, id, isActive)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-1">
      <Button
        variant={isActive ? "outline" : "default"}
        size="sm"
        disabled={loading}
        onClick={handleToggle}
      >
        {loading ? "Saving…" : isActive ? "Deactivate" : "Activate"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
