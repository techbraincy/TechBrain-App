import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layouts/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const role = h.get("x-user-role");
  const username = h.get("x-username") ?? "admin";
  const accountType = h.get("x-account-type") || null;

  // Extra guard in addition to proxy
  if (role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        username={username}
        role="superadmin"
        accountType={accountType}
        hasSheets={true}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
