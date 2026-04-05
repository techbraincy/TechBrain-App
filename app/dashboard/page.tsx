import { headers } from "next/headers";
import Link from "next/link";
import { getSheetsByUserId, getAllSheets } from "@/lib/db/queries/sheets";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { Coffee, CalendarDays, Sheet, Users, ArrowRight, Clock } from "lucide-react";
import type { Sheet as SheetType } from "@/types/db";

async function getPendingOrderCount(): Promise<number> {
  const supabase = getSupabaseServer();
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

async function getTodayReservationCount(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = getSupabaseServer();
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("reservation_date", today)
    .eq("status", "confirmed");
  return count ?? 0;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  color: string;
  iconBg: string;
}

function StatCard({ title, value, subtitle, icon: Icon, href, color, iconBg }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-800/70 transition-all duration-200"
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-slate-100 mt-1 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0" />
    </Link>
  );
}

export default async function DashboardPage() {
  const h = await headers();
  const userId = h.get("x-user-id")!;
  const role = h.get("x-user-role");
  const username = h.get("x-username") ?? "";
  const accountType = h.get("x-account-type") || null;

  const showOrders = role === "superadmin" || !accountType || accountType === "caffe";
  const showReservations = role === "superadmin" || !accountType || accountType === "restaurant";

  // Parallel data fetching
  const [sheets, pendingOrders, todayReservations] = await Promise.all([
    role === "superadmin" ? getAllSheets() : getSheetsByUserId(userId),
    showOrders ? getPendingOrderCount() : Promise.resolve(0),
    showReservations ? getTodayReservationCount() : Promise.resolve(0),
  ]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">
          {greeting}, <span className="text-indigo-400">{username}</span>
        </h1>
      </div>

      {/* Stats */}
      {(showOrders || showReservations || sheets.length > 0 || role === "superadmin") && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showOrders && (
            <StatCard
              title="Pending Orders"
              value={pendingOrders}
              subtitle="Awaiting fulfillment"
              icon={Coffee}
              href="/dashboard/orders"
              color="text-orange-400"
              iconBg="bg-orange-500/10"
            />
          )}
          {showReservations && (
            <StatCard
              title="Today's Reservations"
              value={todayReservations}
              subtitle="Confirmed for today"
              icon={CalendarDays}
              href="/dashboard/reservations"
              color="text-emerald-400"
              iconBg="bg-emerald-500/10"
            />
          )}
          {(sheets.length > 0 || role === "superadmin") && (
            <StatCard
              title={role === "superadmin" ? "Total Sheets" : "My Sheets"}
              value={sheets.length}
              subtitle="Google Sheets connected"
              icon={Sheet}
              href="/dashboard/sheets"
              color="text-indigo-400"
              iconBg="bg-indigo-500/10"
            />
          )}
          {role === "superadmin" && (
            <StatCard
              title="Users"
              value="—"
              subtitle="Manage team members"
              icon={Users}
              href="/admin"
              color="text-violet-400"
              iconBg="bg-violet-500/10"
            />
          )}
        </div>
      )}

      {/* Quick access sheets */}
      {sheets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">
              {role === "superadmin" ? "All Sheets" : "My Sheets"}
            </h2>
            <Link
              href="/dashboard/sheets"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.slice(0, 6).map((sheet: SheetType) => (
              <Link
                key={sheet.id}
                href={`/dashboard/sheets/${sheet.id}`}
                className="group flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 hover:bg-slate-800/70 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                  <Sheet className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{sheet.display_name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{sheet.range_notation}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!showOrders && !showReservations && sheets.length === 0 && role !== "superadmin" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium">No content yet</p>
          <p className="text-sm text-slate-600 mt-1">Contact your administrator to get access.</p>
        </div>
      )}
    </div>
  );
}
