"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyRound, Mail, Eye, EyeOff } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changeOwnEmail, changeOwnPassword } from "@/app/(app)/account/actions"

/**
 * Self-service login-email and password change for the signed-in admin.
 * Both require the current password before anything changes — a session
 * left open on a shared shop-floor terminal shouldn't be enough on its own
 * to permanently take over the account.
 */
export function AccountSecurityCard({ currentEmail }: { currentEmail: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [emailPassword, setEmailPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [showEmailPw, setShowEmailPw] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)

  function submitEmail() {
    if (!emailPassword || !newEmail) {
      toast.error("Enter your current password and the new email.")
      return
    }
    startTransition(async () => {
      const res = await changeOwnEmail({ currentPassword: emailPassword, newEmail })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Email updated. Use the new address next time you sign in.")
      setEmailPassword("")
      setNewEmail("")
      router.refresh()
    })
  }

  function submitPassword() {
    if (!currentPassword || !newPassword) {
      toast.error("Enter your current and new password.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation don't match.")
      return
    }
    startTransition(async () => {
      const res = await changeOwnPassword({ currentPassword, newPassword })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Password updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> My Account
        </CardTitle>
        <CardDescription>
          Signed in as <span className="font-medium text-foreground">{currentEmail}</span>. Change
          your own login email or password below — both need your current password first.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 pt-0 sm:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Mail className="h-3.5 w-3.5" /> Change login email
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="acc-email-pw">Current password</Label>
            <div className="relative">
              <Input
                id="acc-email-pw"
                type={showEmailPw ? "text" : "password"}
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                autoComplete="current-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowEmailPw((v) => !v)}
                className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showEmailPw ? "Hide password" : "Show password"}
              >
                {showEmailPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-new-email">New email</Label>
            <Input
              id="acc-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@raghaveng.com"
              autoComplete="email"
            />
          </div>
          <Button
            size="sm"
            onClick={submitEmail}
            disabled={isPending || !emailPassword || !newEmail}
          >
            {isPending ? "Saving…" : "Update email"}
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <KeyRound className="h-3.5 w-3.5" /> Change password
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="acc-current-pw">Current password</Label>
            <div className="relative">
              <Input
                id="acc-current-pw"
                type={showPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-new-pw">New password</Label>
              <Input
                id="acc-new-pw"
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="min 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-confirm-pw">Confirm</Label>
              <Input
                id="acc-confirm-pw"
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={submitPassword}
            disabled={isPending || !currentPassword || !newPassword}
          >
            {isPending ? "Saving…" : "Update password"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
