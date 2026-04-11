import { headers } from "next/headers";
import Link from "next/link";
import { getBusinessesByUser, getAllBusinesses } from "@/lib/db/queries/businesses";
import { Plus, Mic2, CheckCircle2, AlertCircle, Clock, ChevronRight, Zap } from "lucide-react";
import type { BusinessWithAgent } from "@/types/agent";
import { BUSINESS_CATEGORIES } from "@/types/agent";

function statusBadge(status: string | undefined) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Active
        </span>
      );
    case "creating":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
          <Zap className="w-3 h-3 animate-pulse" /> Creating
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" /> Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
  }
}

function categoryLabel(cat: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === cat) ?? { label: cat, emoji: "🏢" };
}

function BusinessCard({ business }: { business: BusinessWithAgent }) {
  const agentStatus = business.agent?.status;
  const cat = categoryLabel(business.business_category);

  return (
    <Link
      href={`/voice-agent/${business.id}`}
      className="group flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-violet-200 hover:shadow-md transition-all duration-200"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      {/* Category icon */}
      <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
        {cat.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
              {business.business_name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{cat.label}</p>
          </div>
          {statusBadge(agentStatus)}
        </div>

        <div className="flex items-center gap-4 mt-3">
          {business.phone_number && (
            <span className="text-xs text-gray-500">{business.phone_number}</span>
          )}
          {business.agent?.agent_name && (
            <span className="text-xs text-violet-600 flex items-center gap-1">
              <Mic2 className="w-3 h-3" />
              {business.agent.agent_name}
            </span>
          )}
        </div>

        {/* Capability chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {business.reservation_enabled && (
            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
              Reservations
            </span>
          )}
          {business.delivery_enabled && (
            <span className="text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
              Delivery
            </span>
          )}
          {business.takeaway_enabled && (
            <span className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              Takeaway
            </span>
          )}
          {business.meetings_enabled && (
            <span className="text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
              Appointments
            </span>
          )}
          {!business.onboarding_complete && (
            <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
              Setup incomplete
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 flex-shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

export default async function VoiceAgentPage() {
  const h      = await headers();
  const userId = h.get("x-user-id")!;
  const role   = h.get("x-user-role") ?? "user";

  const businesses = role === "superadmin"
    ? await getAllBusinesses()
    : await getBusinessesByUser(userId);

  const activeCount  = businesses.filter((b) => b.agent?.status === "active").length;
  const pendingCount = businesses.filter((b) => !b.onboarding_complete).length;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Voice Agents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage AI voice agents for your businesses
          </p>
        </div>
        <Link
          href="/voice-agent/onboarding"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Business
        </Link>
      </div>

      {/* Stats */}
      {businesses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{businesses.length}</p>
            <p className="text-xs text-gray-400 mt-1">businesses</p>
          </div>
          <div className="bg-white border border-emerald-100 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Active</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{activeCount}</p>
            <p className="text-xs text-gray-400 mt-1">agents running</p>
          </div>
          <div className="bg-white border border-amber-100 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Pending</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingCount}</p>
            <p className="text-xs text-gray-400 mt-1">need setup</p>
          </div>
        </div>
      )}

      {/* Business list */}
      {businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 border-2 border-dashed border-violet-200 flex items-center justify-center mb-5">
            <Mic2 className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">No businesses yet</h2>
          <p className="text-sm text-gray-400 mt-2 max-w-xs">
            Create your first business to set up an AI voice agent that handles calls, bookings, and more.
          </p>
          <Link
            href="/voice-agent/onboarding"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Get started
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Your businesses</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
