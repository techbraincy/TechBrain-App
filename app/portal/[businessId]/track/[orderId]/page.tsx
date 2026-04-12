import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { Business } from "@/types/agent";
import OrderTrackingClient from "@/components/portal/OrderTrackingClient";

type Params = { params: Promise<{ businessId: string; orderId: string }> };

export default async function TrackOrderPage({ params }: Params) {
  const { businessId, orderId } = await params;
  const supabase = getSupabaseServer();

  const [bizRes, orderRes] = await Promise.all([
    supabase.from("businesses").select("business_name, branding_settings, theme_settings, phone_number, address").eq("id", businessId).single(),
    supabase.from("business_orders").select("id, customer_name, order_type, items, items_summary, total_amount, status, estimated_ready_at, created_at, accepted_at, completed_at, delivery_address, special_instructions").eq("id", orderId).eq("business_id", businessId).single(),
  ]);

  if (bizRes.error || orderRes.error) notFound();

  const { data: history } = await supabase
    .from("order_status_history")
    .select("status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return (
    <OrderTrackingClient
      business={bizRes.data as Pick<Business, "business_name" | "branding_settings" | "theme_settings" | "phone_number" | "address">}
      order={orderRes.data as any}
      history={history ?? []}
      businessId={businessId}
      orderId={orderId}
    />
  );
}
