import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layouts/sidebar";
import PageTransition from "@/components/layouts/page-transition";
import type { Permissions } from "@/types/db";

export default async function VoiceAgentLayout({ children }: { children: React.ReactNode }) {
  const h        = await headers();
  const userId   = h.get("x-user-id");
  const role     = (h.get("x-user-role") ?? "user") as "user" | "superadmin";
  const username = h.get("x-username") ?? "user";
  const rawPerms = h.get("x-permissions");
  const permissions: Permissions | null = rawPerms ? JSON.parse(rawPerms) : null;

  if (!userId) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        username={username}
        role={role}
        accountType={null}
        hasSheets={false}
        permissions={permissions}
      />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
