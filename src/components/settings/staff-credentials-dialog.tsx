"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Mail, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { updateStaffEmail, resetStaffPassword } from "@/app/(app)/settings/actions"

/**
 * Admin controls for one staff member's login: change their email, or set a
 * new password. Mirrors the equivalent controls already trusted for
 * customer portal logins (PortalUserManageDialog), scoped to staff accounts.
 */
export function StaffCredentialsDialog({
  userId,
  userName,
  currentEmail,
}: {
  userId: string
  userName: string
  currentEmail?: string
}) {
  const router = useRouter()
  const [emailOpen, setEmailOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState(currentEmail ?? "")
  const [password, setPassword] = useState("")

  async function saveEmail() {
    if (!email.includes("@")) {
      toast.error("Enter a valid email address.")
      return
    }
    setBusy(true)
    const res = await updateStaffEmail(userId, email)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Email updated for ${userName}`)
    setEmailOpen(false)
    router.refresh()
  }

  async function savePassword() {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    setBusy(true)
    const res = await resetStaffPassword(userId, password)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Password updated for ${userName}`)
    setPassword("")
    setPwOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="icon-sm" title="Change email" onClick={() => setEmailOpen(true)}>
        <Mail className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Reset password" onClick={() => setPwOpen(true)}>
        <KeyRound className="h-4 w-4" />
      </Button>

      <Dialog open={emailOpen} onOpenChange={(o) => !busy && setEmailOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change email — {userName}</DialogTitle>
            <DialogDescription>
              Updates their login email immediately — no confirmation link needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">New email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={saveEmail} disabled={busy}>
              {busy ? "Saving…" : "Update email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={(o) => !busy && setPwOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password — {userName}</DialogTitle>
            <DialogDescription>
              Sets a new sign-in password immediately. Share it securely and ask them to change it
              from My Account after signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="staff-newpass">New password</Label>
            <Input
              id="staff-newpass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 characters"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={savePassword} disabled={busy || password.length < 8}>
              {busy ? "Saving…" : "Set password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
