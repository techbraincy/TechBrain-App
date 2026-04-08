import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";

export async function GET() {
  const h = await headers();
  if (!h.get("x-user-id")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = resolveAccess(
    h.get("x-user-role") ?? "user",
    h.get("x-account-type") || null,
    parsePermissionsHeader(h.get("x-permissions"))
  );
  if (!access.reservations) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = parseTenantId(h.get("x-tenant-id"));
  const supabase = getSupabaseServer();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("reservations")
    .select("*")
    .gte("reservation_date", today)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .limit(200);

  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
