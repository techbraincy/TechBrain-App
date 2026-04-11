import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role   = h.get("x-user-role") ?? "user";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId } = await params;
  const supabase = getSupabaseServer();

  // Ownership check (superadmin bypasses)
  if (role !== "superadmin") {
    const { data: biz } = await supabase
      .from("businesses").select("user_id").eq("id", businessId).single();
    if (!biz || biz.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("business_orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
