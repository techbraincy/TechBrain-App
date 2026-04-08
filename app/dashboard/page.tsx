import { headers } from "next/headers";
import Link from "next/link";
import { getSheetsByUserId, getAllSheets } from "@/lib/db/queries/sheets";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";
import { Coffee, CalendarDays, Sheet, Users, ArrowRight, Clock } from "lucide-react";
import type { Sheet as SheetType } from "@/types/db";

async function getPendingOrderCount(tenantId: string | null): Promise<number> {
  const supabase = getSupabaseServer();
  let q = supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { count } = await q;
  return count ?? 0;
}

async function getTodayReservationCount(tenantId: string | null): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = getSupabaseServer();
  let q = supabase.from("reservations").select("*", { count: "exact", head: true }).eq("reservation_date", today).eq("status", "confirmed");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { count } = await q;
  return count ?? 0;
}

async function getOrderSparkline(tenantId: string | null): Promise<number[]> {
  const supabase = getSupabaseServer();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  let q = supabase.from("orders").select("created_at").gte("created_at", since.toISOString());
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data } = await q;
  const counts = Array(7).fill(0);
  for (const o of data ?? []) {
    const daysAgo = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86_400_000);
    if (daysAgo >= 0 && daysAgo <= 6) counts[6 - daysAgo]++;
  }
  return counts;
}

async function getRecentActivity(showOrders: boolean, showReservations: boolean, tenantId: string | null) {
  const supabase = getSupabaseServer();

  function ordersQ() {
    let q = supabase.from("orders").select("id, customer_name, items_summary, status, created_at").order("created_at", { ascending: false }).limit(6);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  }
  function reservationsQ() {
    let q = supabase.from("reservations").select("reservation_id, customer_name, reservation_date, status, created_at").order("created_at", { ascending: false }).limit(6);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  }

  const [ordersRes, reservationsRes] = await Promise.all([
    showOrders      ? ordersQ()       : Promise.resolve({ data: [] }),
    showReservations ? reservationsQ() : Promise.resolve({ data: [] }),
  ]);

  type Item = { type: "order" | "reservation"; id: string; name: string; status: string; created_at: string; extra?: string };

  const items: Item[] = [
    ...(ordersRes.data ?? []).map((o) => ({
      type: "order" as const,
      id: o.id,
      name: o.customer_name || "Unknown",
      status: o.status,
      created_at: o.created_at,
      extra: o.items_summary,
    })),
    ...(reservationsRes.data ?? []).map((r) => ({
      type: "reservation" as const,
      id: r.reservation_id,
      name: r.customer_name || "Unknown",
      status: r.status,
      created_at: r.created_at,
      extra: r.reservation_date,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return items;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.every((v) => v === 0)) return null;
  const max = Math.max(...data, 1);
  const w = 64, h = 24, pad = 2;
  const step = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  color: string;
  iconBg: string;
  borderColor: string;
  sparkline?: number[];
  sparkColor?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, href, color, iconBg, borderColor, sparkline, sparkColor }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-4 p-5 bg-white border rounded-2xl hover:shadow-md transition-all duration-200 ${borderColor}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end justify-between h-full gap-2">
        {sparkline && sparkColor && <Sparkline data={sparkline} color={sparkColor} />}
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const h = await headers();
  const userId      = h.get("x-user-id")!;
  const role        = h.get("x-user-role") ?? "user";
  const username    = h.get("x-username") ?? "";
  const accountType = h.get("x-account-type") || null;
  const permissions = parsePermissionsHeader(h.get("x-permissions"));
  const tenantId    = parseTenantId(h.get("x-tenant-id"));

  const access = resolveAccess(role, accountType, permissions);

  const [sheets, pendingOrders, todayReservations, sparkline, activity] = await Promise.all([
    role === "superadmin" ? getAllSheets() : getSheetsByUserId(userId),
    access.orders        ? getPendingOrderCount(tenantId)       : Promise.resolve(0),
    access.reservations  ? getTodayReservationCount(tenantId)   : Promise.resolve(0),
    access.orders        ? getOrderSparkline(tenantId)          : Promise.resolve([]),
    getRecentActivity(access.orders, access.reservations, tenantId),
  ]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const hasAnything = access.orders || access.reservations || sheets.length > 0 || role === "superadmin";

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          {greeting}, <span className="text-violet-600">{username}</span>
        </h1>
      </div>

      {/* Stats */}
      {hasAnything && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {access.orders && (
            <StatCard
              title="Pending Orders" value={pendingOrders}
              subtitle="Awaiting fulfillment"
              icon={Coffee} href="/dashboard/orders"
              color="text-orange-500" iconBg="bg-orange-50"
              borderColor="border-orange-100 hover:border-orange-200"
              sparkline={sparkline} sparkColor="#f97316"
            />
          )}
          {access.reservations && (
            <StatCard
              title="Today's Reservations" value={todayReservations}
              subtitle="Confirmed for today"
              icon={CalendarDays} href="/dashboard/reservations"
              color="text-emerald-600" iconBg="bg-emerald-50"
              borderColor="border-emerald-100 hover:border-emerald-200"
            />
          )}
          {(access.sheets && sheets.length > 0) || role === "superadmin" ? (
            <StatCard
              title={role === "superadmin" ? "Total Sheets" : "My Sheets"}
              value={sheets.length} subtitle="Google Sheets connected"
              icon={Sheet} href="/dashboard/sheets"
              color="text-indigo-600" iconBg="bg-indigo-50"
              borderColor="border-indigo-100 hover:border-indigo-200"
            />
          ) : null}
          {role === "superadmin" && (
            <StatCard
              title="Users" value="—" subtitle="Manage team members"
              icon={Users} href="/admin"
              color="text-violet-600" iconBg="bg-violet-50"
              borderColor="border-violet-100 hover:border-violet-200"
            />
          )}
        </div>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-50"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  item.type === "order"
                    ? item.status === "pending" ? "bg-orange-400" : "bg-green-500"
                    : item.status === "confirmed" ? "bg-emerald-400" : "bg-gray-300"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">
                    {item.type === "order"
                      ? <><span className="font-semibold text-gray-900">{item.name}</span> — {item.extra}</>
                      : <>Reservation for <span className="font-semibold text-gray-900">{item.name}</span> on {item.extra}</>
                    }
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick access sheets */}
      {sheets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {role === "superadmin" ? "All Sheets" : "My Sheets"}
            </h2>
            <Link href="/dashboard/sheets" className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 transition-colors font-medium">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.slice(0, 6).map((sheet: SheetType) => (
              <Link
                key={sheet.id}
                href={`/dashboard/sheets/${sheet.id}`}
                className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Sheet className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{sheet.display_name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{sheet.range_notation}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No access state */}
      {!hasAnything && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No content yet</p>
          <p className="text-sm text-gray-400 mt-1">Contact your administrator to get access.</p>
        </div>
      )}
    </div>
  );
}
