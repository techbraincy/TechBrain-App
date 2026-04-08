import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";

export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = resolveAccess(
    headersList.get("x-user-role") ?? "user",
    headersList.get("x-account-type") || null,
    parsePermissionsHeader(headersList.get("x-permissions"))
  );
  if (!access.orders) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = parseTenantId(headersList.get("x-tenant-id"));
  const supabase = getSupabaseServer();

  let query = supabase
    .from("orders")
    .select("id, customer_name, items_summary, customer_phone, delivery_address, caller_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
