import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { validateCsrf } from "@/lib/auth/csrf";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";
import { z } from "zod";

const schema = z.object({ status: z.enum(["pending", "done"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = resolveAccess(
    headersList.get("x-user-role") ?? "user",
    headersList.get("x-account-type") || null,
    parsePermissionsHeader(headersList.get("x-permissions"))
  );
  if (!access.orders) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { orderId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const tenantId = parseTenantId(headersList.get("x-tenant-id"));
  const supabase = getSupabaseServer();

  let query = supabase.from("orders").update({ status: body.data.status }).eq("id", orderId);
  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { error } = await query;
  if (error) {
    console.error("[PATCH /api/orders] supabase error:", JSON.stringify(error));
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = resolveAccess(
    headersList.get("x-user-role") ?? "user",
    headersList.get("x-account-type") || null,
    parsePermissionsHeader(headersList.get("x-permissions"))
  );
  if (!access.orders) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { orderId } = await params;
  const tenantId = parseTenantId(headersList.get("x-tenant-id"));
  const supabase = getSupabaseServer();

  let query = supabase.from("orders").delete().eq("id", orderId);
  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
