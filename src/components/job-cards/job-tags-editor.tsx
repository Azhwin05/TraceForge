"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tag, X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateJobCardTags } from "@/app/(app)/job-cards/actions"
import type { UserRole } from "@/types/database"

const WRITE_ROLES: UserRole[] = ["admin", "operator", "engineer", "qa"]

/**
 * Inline tag editor on the job card (client request #1).
 *
 * Tags are normalised server-side too — this only mirrors it for immediate
 * feedback, so the chip you see is the chip that gets stored.
 */
export function JobTagsEditor({
  jobCardId, tags, userRole,
}: {
  jobCardId: string
  tags: string[]
  userRole: UserRole
}) {
  const router = useRouter()
  const [current, setCurrent] = useState<string[]>(tags ?? [])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)

  const canEdit = WRITE_ROLES.includes(userRole)

  async function save(next: string[]) {
    setBusy(true)
    const res = await updateJobCardTags(jobCardId, next)
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    setCurrent(res.tags ?? next)
    router.refresh()
  }

  function addTag() {
    const t = draft.trim().toLowerCase()
    if (!t) return
    if (current.includes(t)) { setDraft(""); return }
    const next = [...current, t]
    setDraft("")
    void save(next)
  }

  function removeTag(t: string) {
    void save(current.filter((x) => x !== t))
  }

  if (!canEdit && current.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag className="h-4 w-4 text-muted-foreground" />

      {current.length === 0 && (
        <span className="text-xs text-muted-foreground">No tags</span>
      )}

      {current.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary"
        >
          {t}
          {canEdit && (
            <button
              type="button"
              onClick={() => removeTag(t)}
              disabled={busy}
              aria-label={`Remove tag ${t}`}
              className="hover:text-destructive disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}

      {canEdit && (
        <div className="flex items-center gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag() }
            }}
            placeholder="Add tag…"
            disabled={busy}
            className="h-7 w-32 text-xs"
          />
          <Button
            type="button" size="sm" variant="ghost"
            onClick={addTag} disabled={busy || !draft.trim()}
            className="h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
