import { headers } from "next/headers";
import { getSheetsByUserId, getAllSheets } from "@/lib/db/queries/sheets";
import Sidebar from "@/components/layouts/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";
  const role = (h.get("x-user-role") ?? "user") as "user" | "superadmin";
  const username = h.get("x-username") ?? "user";
  const accountType = h.get("x-account-type") || null;

  // Check if user has any sheets assigned
  const sheets = role === "superadmin"
    ? await getAllSheets()
    : await getSheetsByUserId(userId);
  const hasSheets = sheets.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        username={username}
        role={role}
        accountType={accountType}
        hasSheets={hasSheets}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
