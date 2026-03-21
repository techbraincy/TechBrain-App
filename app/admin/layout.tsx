import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  // Extra guard in addition to middleware
  if (role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">Sheets Dashboard</span>
          <span className="text-xs bg-purple-100 text-purple-700 font-medium rounded px-2 py-0.5">
            Superadmin
          </span>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
            Users
          </Link>
          <Link href="/admin/sheets" className="text-sm text-gray-600 hover:text-gray-900">
            Sheets
          </Link>
        </div>
        <LogoutButton />
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
