"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  setPortalUserCompanies, resetPortalUserPassword,
} from "@/app/(app)/portal-users/actions"

type Client = { id: string; name: string }

/**
 * Admin controls for one portal login: which companies it can see, and a
 * password reset. Both were previously only possible via direct database
 * access.
 */
export function PortalUserManageDialog({
  userId,
  userName,
  primaryClientId,
  clients,
  extraClientIds,
}: {
  userId: string
  userName: string
  primaryClientId: string | null
  clients: Client[]
  extraClientIds: string[]
}) {
  const router = useRouter()
  const [companiesOpen, setCompaniesOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string[]>(extraClientIds)
  const [password, setPassword] = useState("")

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function saveCompanies() {
    setBusy(true)
    const res = await setPortalUserCompanies(userId, selected)
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Company access updated")
    setCompaniesOpen(false)
    router.refresh()
  }

  async function savePassword() {
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return }
    setBusy(true)
    const res = await resetPortalUserPassword(userId, password)
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    toast.success(`Password updated for ${userName}`)
    setPassword("")
    setPwOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="sm" title="Manage companies" onClick={() => setCompaniesOpen(true)}>
        <Building2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" title="Reset password" onClick={() => setPwOpen(true)}>
        <KeyRound className="h-4 w-4" />
      </Button>

      <Dialog open={companiesOpen} onOpenChange={(o) => !busy && setCompaniesOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Company access — {userName}</DialogTitle>
            <DialogDescription>
              Tick every additional company this login should see. Their primary company is
              always included and can&apos;t be removed here.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {clients.map((c) => {
              const isPrimary = c.id === primaryClientId
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
                    isPrimary ? "opacity-60" : "cursor-pointer hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={isPrimary}
                    checked={isPrimary || selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border border-input"
                  />
                  <span>{c.name}</span>
                  {isPrimary && <span className="text-xs text-muted-foreground">(primary)</span>}
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompaniesOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={saveCompanies} disabled={busy}>{busy ? "Saving…" : "Save access"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={(o) => !busy && setPwOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password — {userName}</DialogTitle>
            <DialogDescription>
              Sets a new sign-in password immediately. Share it securely and ask them to
              change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="pu-newpass">New password</Label>
            <Input
              id="pu-newpass" type="text" value={password} className="mt-1"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 characters"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={savePassword} disabled={busy || password.length < 8}>
              {busy ? "Saving…" : "Set password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
