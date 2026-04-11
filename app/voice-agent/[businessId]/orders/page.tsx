import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getBusinessById } from "@/lib/db/queries/businesses";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import BusinessDashboardClient from "@/components/voice-agent/BusinessDashboardClient";

type Params = { params: Promise<{ businessId: string }> };

export default async function BusinessOrdersPage({ params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id")!;
  const role   = h.get("x-user-role") ?? "user";

  const { businessId } = await params;
  const business = await getBusinessById(businessId, role === "superadmin" ? undefined : userId);
  if (!business) notFound();

  const supabase = getSupabaseServer();

  const [ordersRes, resRes] = await Promise.all([
    business.delivery_enabled || business.takeaway_enabled
      ? supabase
          .from("business_orders")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    business.reservation_enabled || business.meetings_enabled
      ? supabase
          .from("business_reservations")
          .select("*")
          .eq("business_id", businessId)
          .order("reservation_date", { ascending: true })
          .order("reservation_time", { ascending: true })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href={`/voice-agent/${businessId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {business.business_name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Orders and reservations update in real-time</p>
      </div>

      <BusinessDashboardClient
        businessId={businessId}
        initialOrders={(ordersRes.data as any[]) ?? []}
        initialReservations={(resRes.data as any[]) ?? []}
        hasOrders={business.delivery_enabled || business.takeaway_enabled}
        hasReservations={business.reservation_enabled || business.meetings_enabled}
        isMeetings={business.meetings_enabled && !business.reservation_enabled}
      />
    </div>
  );
}
