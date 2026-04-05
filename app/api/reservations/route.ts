import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";

export async function GET() {
  const h = await headers();
  if (!h.get("x-user-id")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServer();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .gte("reservation_date", today)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
