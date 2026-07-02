"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createPortalUser } from "@/app/(app)/portal-users/actions"

export function PortalUsersClient({
  clients,
  provisioningEnabled,
}: {
  clients: { id: string; name: string }[]
  provisioningEnabled: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ fullName: "", email: "", password: "", clientId: "" })

  function submit() {
    if (!form.fullName || !form.email || !form.password || !form.clientId) {
      toast.error("All fields are required")
      return
    }
    startTransition(async () => {
      const res = await createPortalUser(form)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Portal user created")
        setForm({ fullName: "", email: "", password: "", clientId: "" })
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" /> Create portal login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pu-name">Contact name</Label>
            <Input id="pu-name" value={form.fullName} disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="e.g. Ramesh Kumar" />
          </div>
          <div>
            <Label htmlFor="pu-client">Client company</Label>
            <select
              id="pu-client"
              value={form.clientId}
              disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pu-email">Login email</Label>
            <Input id="pu-email" type="email" value={form.email} disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="official@lntvalves.com" />
          </div>
          <div>
            <Label htmlFor="pu-pass">Temporary password</Label>
            <Input id="pu-pass" type="text" value={form.password} disabled={!provisioningEnabled}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="min 8 characters" />
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={isPending || !provisioningEnabled}>
          {isPending ? "Creating…" : "Create portal user"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          The customer signs in at <code>/login</code> and lands on their portal automatically.
          Share the temporary password securely and ask them to change it.
        </p>
      </CardContent>
    </Card>
  )
}
