"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserPlus, Eye, EyeOff } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { createStaffUser } from "@/app/(app)/settings/actions"
import { STAFF_ROLES, type StaffRole } from "@/lib/validations/staff-account"

export function AddStaffUserForm({ provisioningEnabled }: { provisioningEnabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "operator" as StaffRole,
  })

  function submit() {
    if (!form.fullName || !form.email || !form.password) {
      toast.error("Full name, email and password are all required.")
      return
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    startTransition(async () => {
      const res = await createStaffUser(form)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`${form.fullName} can now sign in as ${form.role}.`)
      setForm({ fullName: "", email: "", password: "", role: "operator" })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Add staff account
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="su-name">Full name</Label>
            <Input
              id="su-name"
              value={form.fullName}
              disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="e.g. Priya Sharma"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-role">Role</Label>
            <Select
              id="su-role"
              value={form.role}
              disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-email">Login email</Label>
            <Input
              id="su-email"
              type="email"
              value={form.email}
              disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@raghaveng.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-pass">Temporary password</Label>
            <div className="relative">
              <Input
                id="su-pass"
                type={showPassword ? "text" : "password"}
                value={form.password}
                disabled={!provisioningEnabled}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="min 8 characters"
                autoComplete="new-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <Button className="mt-4" size="sm" onClick={submit} disabled={isPending || !provisioningEnabled}>
          {isPending ? "Creating…" : "Create account"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          They sign in at <code>/login</code> with this email and password. Share it securely and
          ask them to change it from <strong>My Account</strong> (their name, top right) after
          signing in.
        </p>
      </CardContent>
    </Card>
  )
}
