import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";

export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_name, items_summary, customer_phone, delivery_address, caller_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
