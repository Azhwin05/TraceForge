"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { archiveDocument } from "@/app/(app)/documents/actions"

export function DocumentArchiveButton({ documentId }: { documentId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleArchive() {
    setLoading(true)
    const result = await archiveDocument(documentId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Document archived")
      router.push("/documents")
    }
  }

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => setConfirming(true)}
      >
        <Archive className="mr-1.5 h-4 w-4" /> Archive
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-destructive">Archive this document?</span>
      <Button size="sm" variant="destructive" onClick={handleArchive} disabled={loading}>
        {loading ? "Archiving…" : "Confirm"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  )
}
