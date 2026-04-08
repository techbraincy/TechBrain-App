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
  if (!access.orders) return NextResponse.json({ pending: 0 });

  const tenantId = parseTenantId(h.get("x-tenant-id"));
  const supabase = getSupabaseServer();

  let query = supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { count } = await query;
  return NextResponse.json({ pending: count ?? 0 });
}
