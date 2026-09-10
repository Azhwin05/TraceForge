"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TEST_ACCOUNTS = [
  { label: "Admin", email: "admin@raghaveng.com" },
  { label: "QA", email: "qa@raghaveng.com" },
  { label: "Engineer", email: "engineer@raghaveng.com" },
  { label: "Operator", email: "operator@raghaveng.com" },
  { label: "Accounts", email: "accounts@raghaveng.com" },
  { label: "Management", email: "management@raghaveng.com" },
] as const;

const TEST_PASSWORD = "Test@123";

/**
 * Shared demo credentials are printed on this page, so they are hidden unless
 * explicitly switched on. Previously they rendered on every deployment, which
 * published a working admin login to anyone who opened the sign-in screen.
 */
const SHOW_TEST_LOGINS =
  process.env.NEXT_PUBLIC_SHOW_TEST_LOGINS === "true" ||
  process.env.NODE_ENV === "development";

const AUTH_ERRORS: Record<string, string> = {
  account_disabled:
    "That account has been deactivated. Ask an administrator to re-enable it.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    AUTH_ERRORS[searchParams.get("error") ?? ""] ?? null
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function signIn(email: string, password: string) {
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Shown inline as well as via toast — a toast can be missed, and the user
      // is left staring at a form with no indication of what went wrong.
      setFormError(
        error.message.toLowerCase().includes("invalid")
          ? "That email and password combination doesn't match an account."
          : "Could not sign in right now. Check your connection and try again."
      );
      return false;
    }
    const redirectTo = searchParams.get("redirectTo") || "/home";
    router.replace(redirectTo);
    router.refresh();
    return true;
  }

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const ok = await signIn(values.email, values.password);
    if (!ok) setIsSubmitting(false);
  }

  async function onQuickLogin(email: string, label: string) {
    setLoadingRole(label);
    setValue("email", email);
    setValue("password", TEST_PASSWORD);
    const ok = await signIn(email, TEST_PASSWORD);
    if (!ok) setLoadingRole(null);
  }

  const busy = isSubmitting || !!loadingRole;

  return (
    <div className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-surface px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" />
          <p className="leading-relaxed">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@raghaveng.com"
            className="h-10"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-danger">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-10 pr-10"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-xs text-danger">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" size="xl" className="w-full" disabled={busy}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {SHOW_TEST_LOGINS && (
        <div className="space-y-2.5 rounded-lg border border-dashed border-border bg-surface-sunken/60 p-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Demo accounts — development only
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => onQuickLogin(account.email, account.label)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingRole === account.label && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
