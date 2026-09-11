"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserCog, Shield, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AddStaffUserForm } from "./add-staff-user-form"
import { StaffCredentialsDialog } from "./staff-credentials-dialog"
import { updateUserRole, toggleUserActive } from "@/app/(app)/settings/actions"
import type { Profile, UserRole } from "@/types/database"

const ROLES: UserRole[] = ["admin", "operator", "engineer", "qa", "accounts", "management"]

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-info-surface text-info",
  operator: "bg-info-surface text-info",
  engineer: "bg-info-surface text-info",
  qa: "bg-warning-surface text-warning",
  accounts: "bg-success-surface text-success",
  management: "bg-danger-surface text-danger",
  customer: "bg-muted text-foreground",
}

export function UsersClient({
  profiles,
  emailById,
  currentUserId,
  isAdmin,
  provisioningEnabled,
}: {
  profiles: Profile[]
  emailById: Record<string, string>
  currentUserId: string
  isAdmin: boolean
  provisioningEnabled: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>("operator")

  function openEdit(profile: Profile) {
    setEditingProfile(profile)
    setSelectedRole(profile.role)
  }

  function saveRole() {
    if (!editingProfile) return
    startTransition(async () => {
      const result = await updateUserRole(editingProfile.id, selectedRole)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Role updated to ${selectedRole}`)
        setEditingProfile(null)
      }
    })
  }

  function handleToggleActive(profile: Profile) {
    startTransition(async () => {
      const result = await toggleUserActive(profile.id, !profile.is_active)
      if (result.error) toast.error(result.error)
      else toast.success(profile.is_active ? "User deactivated" : "User activated")
    })
  }

  return (
    <>
      <div className="space-y-5">
        <PageHeader
          title="Settings"
          description="Manage staff accounts, roles and sign-in credentials."
        />

        {!provisioningEnabled && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning-border bg-warning-surface p-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Provisioning disabled:</strong> set <code>SUPABASE_SERVICE_ROLE_KEY</code> in
              the environment to create staff accounts or change a login&apos;s email/password.
              Roles and active status can still be edited below.
            </p>
          </div>
        )}

        <AddStaffUserForm provisioningEnabled={provisioningEnabled} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Staff Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {profiles.length === 0 ? (
              <EmptyState
                icon={UserCog}
                title="No staff accounts"
                description="Add the first one above."
                compact
              />
            ) : (
              <div className="divide-y divide-border">
                {profiles.map((profile) => {
                  const email = emailById[profile.id]
                  const isSelf = profile.id === currentUserId
                  return (
                    <div key={profile.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-semibold text-brand-700 dark:text-brand-600">
                          {profile.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {profile.full_name}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[profile.role]}`}
                            >
                              {profile.role}
                            </span>
                            {!profile.is_active && (
                              <span className="text-xs text-muted-foreground">inactive</span>
                            )}
                            {email && (
                              <span className="truncate text-xs text-muted-foreground">{email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-1">
                          {!isSelf && provisioningEnabled && (
                            <StaffCredentialsDialog
                              userId={profile.id}
                              userName={profile.full_name}
                              currentEmail={email}
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(profile)}
                            disabled={isPending}
                          >
                            Edit Role
                          </Button>
                          {!isSelf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(profile)}
                              disabled={isPending}
                              className={
                                profile.is_active
                                  ? "text-danger hover:text-danger"
                                  : "text-success hover:text-success"
                              }
                            >
                              {profile.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((role) => (
                <div key={role} className="rounded-lg border border-border p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}>
                    {role}
                  </span>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {role === "admin" && "Full access — all pages, status changes, user management"}
                    {role === "operator" && "Create job cards, update basic status, view all jobs"}
                    {role === "engineer" && "View job cards, update process execution records"}
                    {role === "qa" && "Approve/reject WPS, upload reports, QA sign-off"}
                    {role === "accounts" && "View dispatch info, update invoice/payment records"}
                    {role === "management" && "Read-only dashboard and reports view"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role — {editingProfile?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <label
                  key={role}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedRole === role
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="sr-only"
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                  />
                  <span
                    className={`h-3 w-3 rounded-full ${selectedRole === role ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>
              Cancel
            </Button>
            <Button onClick={saveRole} disabled={isPending}>
              {isPending ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
