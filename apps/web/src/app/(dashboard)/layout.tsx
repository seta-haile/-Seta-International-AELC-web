import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    // The session cookie exists but failed /auth/me validation (expired,
    // revoked, or from a different API). The proxy middleware only checks
    // cookie presence, so leaving it set would bounce /login <-> /dashboard
    // forever - clearing it here breaks that loop.
    (await cookies()).delete("session");
    redirect("/login");
  }

  return (
    <div className="flex flex-1 bg-muted/40 text-foreground">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
