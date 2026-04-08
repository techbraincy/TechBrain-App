import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";

export async function GET() {
  const h = await headers();
  const userId      = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role        = h.get("x-user-role") ?? "user";
  const accountType = h.get("x-account-type") || null;
  const permissions = parsePermissionsHeader(h.get("x-permissions"));

  const access = resolveAccess(role, accountType, permissions);
  const tenantId = parseTenantId(h.get("x-tenant-id"));
  const supabase = getSupabaseServer();

  // Last 7 days for sparkline
  const since7 = new Date();
  since7.setDate(since7.getDate() - 6);
  since7.setHours(0, 0, 0, 0);

  function ordersQ(select: string) {
    let q = supabase.from("orders").select(select);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  }
  function reservationsQ(select: string) {
    let q = supabase.from("reservations").select(select);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  }

  const [ordersRes, reservationsRes, weeklyRes] = await Promise.all([
    access.orders
      ? ordersQ("id, customer_name, items_summary, status, created_at").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    access.reservations
      ? reservationsQ("reservation_id, customer_name, reservation_date, reservation_time, party_size, status, created_at").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    access.orders
      ? ordersQ("created_at").gte("created_at", since7.toISOString())
      : Promise.resolve({ data: [] }),
  ]);

  // 7-day sparkline
  const sparkline: number[] = Array(7).fill(0);
  for (const o of (weeklyRes.data ?? []) as unknown as { created_at: string }[]) {
    const daysAgo = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86_400_000);
    if (daysAgo >= 0 && daysAgo <= 6) sparkline[6 - daysAgo]++;
  }

  type ActivityItem = {
    type: "order" | "reservation";
    id: string;
    name: string;
    status: string;
    created_at: string;
    extra?: string;
  };

  const items: ActivityItem[] = [
    ...(ordersRes.data ?? []).map((o: any) => ({
      type: "order" as const,
      id: o.id,
      name: o.customer_name || "Unknown",
      status: o.status,
      created_at: o.created_at,
      extra: o.items_summary,
    })),
    ...(reservationsRes.data ?? []).map((r: any) => ({
      type: "reservation" as const,
      id: r.reservation_id,
      name: r.customer_name || "Unknown",
      status: r.status,
      created_at: r.created_at,
      extra: r.reservation_date,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return NextResponse.json({ items, sparkline });
}
