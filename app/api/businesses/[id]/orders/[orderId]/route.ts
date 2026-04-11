import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { validateCsrf } from "@/lib/auth/csrf";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]),
});

type Params = { params: Promise<{ id: string; orderId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role   = h.get("x-user-role") ?? "user";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  const { id: businessId, orderId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const supabase = getSupabaseServer();

  if (role !== "superadmin") {
    const { data: biz } = await supabase
      .from("businesses").select("user_id").eq("id", businessId).single();
    if (!biz || biz.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("business_orders")
    .update({ status: body.data.status })
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
