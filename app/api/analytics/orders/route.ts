import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = resolveAccess(
    h.get("x-user-role") ?? "user",
    h.get("x-account-type") || null,
    parsePermissionsHeader(h.get("x-permissions"))
  );
  if (!access.orders) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = parseTenantId(h.get("x-tenant-id"));
  const { searchParams } = new URL(req.url);
  const rawDays = parseInt(searchParams.get("days") ?? "30", 10);
  const days = [7, 14, 30, 90].includes(rawDays) ? rawDays : 30;

  const supabase = getSupabaseServer();

  // Current period
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  // Prior period (same length, immediately before current)
  const priorUntil = new Date(since);
  const priorSince = new Date(since);
  priorSince.setDate(priorSince.getDate() - days);

  function ordersQ() {
    let q = supabase.from("orders").select("status, created_at");
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  }

  const [currentRes, priorRes] = await Promise.all([
    ordersQ().gte("created_at", since.toISOString()).order("created_at", { ascending: true }),
    ordersQ().gte("created_at", priorSince.toISOString()).lt("created_at", priorUntil.toISOString()),
  ]);

  const orders = currentRes.data ?? [];
  const priorOrders = priorRes.data ?? [];

  // Orders per day
  const dayMap: Record<string, { total: number; done: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dayMap[key] = { total: 0, done: 0 };
  }

  // Orders per hour (0–23)
  const hourMap: number[] = Array(24).fill(0);

  for (const o of orders) {
    const dt = new Date(o.created_at);
    const day = dt.toISOString().split("T")[0];
    const hour = dt.getHours();
    if (dayMap[day]) {
      dayMap[day].total++;
      if (o.status === "done") dayMap[day].done++;
    }
    hourMap[hour]++;
  }

  const byDay  = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
  const byHour = hourMap.map((count, hour) => ({ hour, count }));

  const totalAll     = orders.length;
  const totalDone    = orders.filter((o) => o.status === "done").length;
  const totalPending = orders.filter((o) => o.status === "pending").length;
  const priorTotal   = priorOrders.length;
  const priorDone    = priorOrders.filter((o) => o.status === "done").length;
  const avgPerDay    = days > 0 ? Math.round((totalAll / days) * 10) / 10 : 0;

  return NextResponse.json({
    byDay, byHour,
    totalAll, totalDone, totalPending,
    priorTotal, priorDone, avgPerDay, days,
  });
}
