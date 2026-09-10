import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardCheck, Warehouse, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — ValveTrack",
};

const CAPABILITIES = [
  {
    icon: ClipboardCheck,
    title: "Traceable job cards",
    body: "Every valve tracked from receipt through welding, PWHT and inspection to dispatch.",
  },
  {
    icon: ShieldCheck,
    title: "Inspection on record",
    body: "PMI, dimensional and overlay reports captured against the job, not a spreadsheet.",
  },
  {
    icon: Warehouse,
    title: "Live stock control",
    body: "Consumable inward, issue and transfer posted to a single append-only ledger.",
  },
];

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <main className="flex min-h-screen bg-background">
      {/* Brand panel — desktop only. A shop-floor login on a phone should be
          the form and nothing else. */}
      <section
        aria-hidden
        className="relative hidden w-[46%] max-w-2xl flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex"
      >
        {/* Engineering grid, faded out toward the bottom */}
        <div
          className="pointer-events-none absolute inset-0 grid-fade opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "rgb(var(--sidebar-accent))" }}
        />

        <BrandLockup className="relative" size={38} />

        <div className="relative">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            The shop floor, on the record.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-sidebar-muted">
            ValveTrack is the operating system for Raghav Engineering — job
            tracking, inspection reporting and inventory in one place.
          </p>

          <ul className="mt-8 space-y-5">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-foreground/10 text-sidebar-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-sidebar-muted">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-2xs text-sidebar-muted/70">
          Raghav Engineering · Internal system
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <BrandLockup tone="dark" size={38} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your Raghav Engineering account to continue.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Trouble signing in? Contact your system administrator to reset your
            password or reactivate your account.
          </p>
        </div>
      </section>
    </main>
  );
}
