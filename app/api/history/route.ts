import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role        = h.get("x-user-role") ?? "user";
  const accountType = h.get("x-account-type") || null;
  const permissions = parsePermissionsHeader(h.get("x-permissions"));
  const access      = resolveAccess(role, accountType, permissions);
  const tenantId    = parseTenantId(h.get("x-tenant-id"));

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json({ orders: [], reservations: [] });

  const supabase = getSupabaseServer();
  const pattern = `%${q}%`;

  const [ordersRes, reservationsRes] = await Promise.all([
    access.orders
      ? (() => {
          let query = supabase
            .from("orders")
            .select("id, customer_name, customer_phone, items_summary, status, created_at")
            .or(`customer_name.ilike.${pattern},customer_phone.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .limit(30);
          if (tenantId) query = query.eq("tenant_id", tenantId);
          return query;
        })()
      : Promise.resolve({ data: [] }),
    access.reservations
      ? (() => {
          let query = supabase
            .from("reservations")
            .select("reservation_id, customer_name, phone_number, reservation_date, reservation_time, party_size, status, notes")
            .or(`customer_name.ilike.${pattern},phone_number.ilike.${pattern}`)
            .order("reservation_date", { ascending: false })
            .limit(30);
          if (tenantId) query = query.eq("tenant_id", tenantId);
          return query;
        })()
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    orders: ordersRes.data ?? [],
    reservations: reservationsRes.data ?? [],
  });
}
