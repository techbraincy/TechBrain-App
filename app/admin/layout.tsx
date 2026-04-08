import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layouts/sidebar";
import PageTransition from "@/components/layouts/page-transition";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h        = await headers();
  const role     = h.get("x-user-role");
  const username = h.get("x-username") ?? "admin";

  if (role !== "superadmin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar username={username} role="superadmin" accountType={null} hasSheets={true} permissions={null} />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
