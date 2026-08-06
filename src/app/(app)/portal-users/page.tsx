import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { isAdminConfigured } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PortalUsersClient } from "@/components/portal/portal-users-client"
import { PortalUserRowActions } from "@/components/portal/portal-user-row-actions"

export const metadata = { title: "Customer Portal Users — ValveTrack" }

type CustomerProfile = {
  id: string
  full_name: string
  is_active: boolean
  created_at: string
  client_id: string | null
  clients: { name: string } | null
}

export default async function PortalUsersPage() {
  const { profile, supabase } = await requireAuth()
  if (profile.role !== "admin") redirect("/dashboard")

  const [{ data: customers }, { data: clients }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, is_active, created_at, client_id, clients(name)")
      .eq("role", "customer")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer Portal Users</h1>
        <p className="text-sm text-muted-foreground">
          Provision external logins so a client (e.g. L&amp;T Valves) can view the complete
          status, inspection reports, and documents for their own jobs — and nothing else.
        </p>
      </div>

      {!isAdminConfigured() && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Provisioning disabled:</strong> set <code>SUPABASE_SERVICE_ROLE_KEY</code> in the
          environment to create portal logins. Existing customer accounts still work; you just
          can&apos;t create new ones from here until the key is configured.
        </div>
      )}

      <PortalUsersClient
        clients={(clients ?? []) as { id: string; name: string }[]}
        provisioningEnabled={isAdminConfigured()}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Existing portal users</CardTitle></CardHeader>
        <CardContent>
          {(!customers || customers.length === 0) ? (
            <p className="text-sm text-muted-foreground">No customer portal users yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Client</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Created</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(customers as unknown as CustomerProfile[]).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-2 font-medium">{c.full_name}</td>
                    <td className="p-2">{c.clients?.name ?? "—"}</td>
                    <td className="p-2">
                      {c.is_active
                        ? <Badge className="bg-green-100 text-green-700">Active</Badge>
                        : <Badge className="bg-gray-100 text-gray-600">Disabled</Badge>}
                    </td>
                    <td className="p-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-2">
                      <div className="flex justify-end">
                        <PortalUserRowActions
                          userId={c.id}
                          label={`${c.full_name}${c.clients?.name ? ` — ${c.clients.name}` : ""}`}
                          isActive={c.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
