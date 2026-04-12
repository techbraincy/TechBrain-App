import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import CustomersClient from "@/components/voice-agent/CustomersClient";

type Params = { params: Promise<{ businessId: string }> };

export default async function CustomersPage({ params }: Params) {
  const { businessId } = await params;
  const h = await headers();
  const userId = h.get("x-user-id");
  const role   = h.get("x-user-role") ?? "user";
  if (!userId) redirect("/login");

  const supabase = getSupabaseServer();

  if (role !== "superadmin") {
    const { data: biz } = await supabase
      .from("businesses").select("user_id").eq("id", businessId).single();
    if (!biz || biz.user_id !== userId) notFound();
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("business_name, branding_settings")
    .eq("id", businessId)
    .single();

  if (!business) notFound();

  const { data: customers } = await supabase
    .from("business_customers")
    .select("id, name, phone, email, preferred_language, notes, total_orders, total_reservations, total_spend, last_seen_at, created_at")
    .eq("business_id", businessId)
    .order("last_seen_at", { ascending: false });

  return (
    <CustomersClient
      businessId={businessId}
      businessName={business.business_name}
      primaryColor={business.branding_settings?.primary_color}
      customers={customers ?? []}
    />
  );
}
