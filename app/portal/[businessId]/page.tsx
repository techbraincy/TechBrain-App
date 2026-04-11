import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { Business } from "@/types/agent";
import PortalClient from "@/components/portal/PortalClient";

type Params = { params: Promise<{ businessId: string }> };

export default async function PortalPage({ params }: Params) {
  const { businessId } = await params;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error || !data) notFound();

  const business = data as Business;

  return <PortalClient business={business} />;
}
