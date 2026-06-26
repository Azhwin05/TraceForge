"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TEST_ACCOUNTS = [
  { label: "Admin",      email: "admin@raghaveng.com",      password: "Test@123",      color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { label: "QA",         email: "qa@raghaveng.com",         password: "Test@123",      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { label: "Engineer",   email: "engineer@raghaveng.com",   password: "Test@123",      color: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" },
  { label: "Operator",   email: "operator@raghaveng.com",   password: "Test@123",      color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  { label: "Accounts",   email: "accounts@raghaveng.com",   password: "Test@123",      color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
  { label: "Management", email: "management@raghaveng.com", password: "Test@123",      color: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Sign in failed", {
        description: "Check your email and password and try again.",
      });
      return false;
    }
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    router.replace(redirectTo);
    router.refresh();
    return true;
  }

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const ok = await signIn(values.email, values.password);
    if (!ok) setIsSubmitting(false);
  }

  async function onQuickLogin(email: string, password: string, label: string) {
    setLoadingRole(label);
    setValue("email", email);
    setValue("password", password);
    const ok = await signIn(email, password);
    if (!ok) setLoadingRole(null);
  }

  return (
    <div className="space-y-5">
      {/* Quick login chips */}
      <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Quick login — test accounts
        </p>
        <div className="flex flex-wrap gap-2">
          {TEST_ACCOUNTS.map((account) => (
            <button
              key={account.label}
              type="button"
              onClick={() => onQuickLogin(account.email, account.password, account.label)}
              disabled={!!loadingRole || isSubmitting}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${account.color}`}
            >
              {loadingRole === account.label && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {account.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@raghaveng.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !!loadingRole}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}
