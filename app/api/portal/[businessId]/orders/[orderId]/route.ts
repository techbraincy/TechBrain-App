import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";

type Params = { params: Promise<{ businessId: string; orderId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { businessId, orderId } = await params;
  const supabase = getSupabaseServer();

  const { data: order, error } = await supabase
    .from("business_orders")
    .select("id, customer_name, order_type, items, items_summary, total_amount, status, estimated_ready_at, created_at, accepted_at, completed_at, delivery_address")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .single();

  if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { data: history } = await supabase
    .from("order_status_history")
    .select("status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ...order, history: history ?? [] });
}
