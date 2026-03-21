import { headers } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">Sheets Dashboard</span>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            My Sheets
          </Link>
          {role === "superadmin" && (
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
        <LogoutButton />
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
