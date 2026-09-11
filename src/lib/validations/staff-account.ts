import { z } from "zod"

/**
 * Shared by every staff-account server action (settings/actions.ts and
 * account/actions.ts) — centralised so the rules can be unit-tested and so
 * "what counts as a valid email/password here" can't drift between the two.
 */

export const STAFF_ROLES = [
  "admin",
  "operator",
  "engineer",
  "qa",
  "accounts",
  "management",
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address")

export const newPasswordSchema = z.string().min(8, "Password must be at least 8 characters")

export const createStaffUserSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  fullName: z.string().trim().min(2, "Full name is required").max(200),
  role: z.enum(STAFF_ROLES),
})

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: newPasswordSchema,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from your current password.",
    path: ["newPassword"],
  })

export const changeOwnEmailSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newEmail: emailSchema,
})
