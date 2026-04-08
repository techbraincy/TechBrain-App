import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { resolveAccess, parsePermissionsHeader, parseTenantId } from "@/lib/auth/permissions";
import { validateCsrf } from "@/lib/auth/csrf";
import { z } from "zod";

const createSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().max(30).optional().default(""),
  delivery_address: z.string().max(200).optional().default(""),
  items: z.array(z.object({
    name: z.string(),
    sugar: z.enum(["sketos", "oligh", "metrios", "glykos"]).default("sketos"),
    quantity: z.number().int().min(1).max(20).default(1),
  })).min(1),
  special_instructions: z.string().max(300).optional().default(""),
});

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = resolveAccess(
    headersList.get("x-user-role") ?? "user",
    headersList.get("x-account-type") || null,
    parsePermissionsHeader(headersList.get("x-permissions"))
  );
  if (!access.orders) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await validateCsrf(req))) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });

  const { customer_name, customer_phone, delivery_address, items, special_instructions } = body.data;

  const SUGAR_LABELS: Record<string, string> = {
    sketos: "sketo", oligh: "oligh", metrios: "metrio", glykos: "glyko",
  };
  const items_summary = items
    .map((i) => {
      const sugar = i.sugar === "sketos" ? "sketo" : SUGAR_LABELS[i.sugar];
      return i.quantity > 1 ? `${i.quantity}x ${i.name} (${sugar})` : `${i.name} (${sugar})`;
    })
    .join(", ");

  const tenantId = parseTenantId(headersList.get("x-tenant-id"));
  const supabase = getSupabaseServer();

  const { data, error } = await supabase.from("orders").insert({
    customer_name,
    customer_phone,
    delivery_address,
    items_summary,
    special_instructions,
    status: "pending",
    tenant_id: tenantId ?? null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

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
