import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBusinessById } from "@/lib/db/queries/businesses";
import BusinessProfileClient from "@/components/voice-agent/BusinessProfileClient";

type Params = { params: Promise<{ businessId: string }> };

export default async function BusinessProfilePage({ params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id")!;
  const role   = h.get("x-user-role") ?? "user";

  const { businessId } = await params;
  const business = await getBusinessById(businessId, role === "superadmin" ? undefined : userId);
  if (!business) notFound();

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link href={`/voice-agent/${businessId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Edit all business details for <strong>{business.business_name}</strong>
        </p>
      </div>
      <BusinessProfileClient business={business} />
    </div>
  );
}
