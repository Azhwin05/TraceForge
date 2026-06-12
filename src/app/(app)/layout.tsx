import { redirect } from "next/navigation";
import { getSessionWithProfile } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithProfile();
  if (!session) redirect("/login");

  const { user, profile } = session;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader
          email={user.email ?? ""}
          fullName={profile?.full_name ?? user.email ?? "User"}
          role={profile?.role ?? "—"}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
