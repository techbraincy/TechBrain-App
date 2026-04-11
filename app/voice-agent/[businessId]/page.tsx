import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Edit3, Mic2, Sliders, CheckCircle2, AlertCircle, Clock, Zap,
  Phone, MapPin, Globe, CalendarDays, Package, Bike, Coffee,
  ChevronRight, ExternalLink, ArrowLeft, RefreshCw
} from "lucide-react";
import { getBusinessById } from "@/lib/db/queries/businesses";
import { BUSINESS_CATEGORIES } from "@/types/agent";
import AgentSyncButton from "@/components/voice-agent/AgentSyncButton";

type Params = { params: Promise<{ businessId: string }> };

function StatusPill({ status }: { status: string | undefined }) {
  if (status === "active") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
      <CheckCircle2 className="w-3.5 h-3.5" /> Agent Active
    </span>
  );
  if (status === "creating") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
      <Zap className="w-3.5 h-3.5 animate-pulse" /> Creating Agent
    </span>
  );
  if (status === "error") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
      <AlertCircle className="w-3.5 h-3.5" /> Agent Error
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
      <Clock className="w-3.5 h-3.5" /> Agent Pending
    </span>
  );
}

function NavCard({ href, icon: Icon, label, desc, color }: {
  href: string; icon: React.ElementType; label: string; desc: string; color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-violet-200 hover:shadow-md transition-all duration-200"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  );
}

export default async function BusinessPage({ params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id")!;
  const role   = h.get("x-user-role") ?? "user";

  const { businessId } = await params;
  const business = await getBusinessById(businessId, role === "superadmin" ? undefined : userId);
  if (!business) notFound();

  const cat = BUSINESS_CATEGORIES.find((c) => c.value === business.business_category);
  const agent = business.agent;
  const hasElevenLabsKey = !!process.env.ELEVENLABS_API_KEY;

  const caps = [
    business.reservation_enabled && { label: "Reservations", icon: CalendarDays, color: "text-emerald-600" },
    business.meetings_enabled    && { label: "Appointments",  icon: CalendarDays, color: "text-purple-600" },
    business.delivery_enabled    && { label: "Delivery",      icon: Bike,         color: "text-orange-600" },
    business.takeaway_enabled    && { label: "Takeaway",      icon: Package,      color: "text-blue-600" },
  ].filter(Boolean) as { label: string; icon: React.ElementType; color: string }[];

  const serviceCount = (business.services?.length ?? 0) + (business.menu_catalog?.length ?? 0);
  const faqCount     = business.faq?.length ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Back */}
      <Link href="/voice-agent" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to businesses
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-3xl flex-shrink-0">
          {cat?.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>
            <StatusPill status={agent?.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">{cat?.label}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {business.phone_number && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="w-3 h-3" /> {business.phone_number}
              </span>
            )}
            {business.address && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" /> {business.address}
              </span>
            )}
            {business.google_maps_link && (
              <a
                href={business.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
              >
                <ExternalLink className="w-3 h-3" /> Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Agent status card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">ElevenLabs Agent</h2>
            {agent?.status === "active" ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{agent.agent_name}</span> is live and ready to take calls.
                </p>
                {agent.elevenlabs_agent_id && (
                  <p className="text-xs font-mono text-gray-400">ID: {agent.elevenlabs_agent_id}</p>
                )}
                {agent.last_synced_at && (
                  <p className="text-xs text-gray-400">
                    Last synced: {new Date(agent.last_synced_at).toLocaleString()}
                  </p>
                )}
                {agent.voice_name && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Mic2 className="w-3 h-3" /> Voice: {agent.voice_name}
                  </p>
                )}
              </div>
            ) : agent?.status === "error" ? (
              <div>
                <p className="text-sm text-red-600 mb-1">Agent creation failed.</p>
                {agent.error_message && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-mono">
                    {agent.error_message}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Agent not yet created on ElevenLabs. Click the button to create it.
              </p>
            )}
          </div>
          <AgentSyncButton
            businessId={business.id}
            agentStatus={agent?.status}
            hasElevenLabs={hasElevenLabsKey}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p className="text-xs text-gray-400 font-medium">Services</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{serviceCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p className="text-xs text-gray-400 font-medium">FAQs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{faqCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p className="text-xs text-gray-400 font-medium">Languages</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {business.languages_supported?.length ?? 2}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p className="text-xs text-gray-400 font-medium">Capabilities</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{caps.length}</p>
        </div>
      </div>

      {/* Capabilities */}
      {caps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {caps.map((cap) => (
            <span
              key={cap.label}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full"
            >
              <cap.icon className={`w-3.5 h-3.5 ${cap.color}`} />
              {cap.label}
            </span>
          ))}
        </div>
      )}

      {/* Navigation cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Manage</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <NavCard
            href={`/voice-agent/${business.id}/profile`}
            icon={Edit3}
            label="Business Profile"
            desc="Update business info, hours, services, FAQ"
            color="bg-blue-50 border border-blue-100 text-blue-600"
          />
          <NavCard
            href={`/voice-agent/${business.id}/agent`}
            icon={Mic2}
            label="Agent Configuration"
            desc="Voice, personality, language, greeting"
            color="bg-violet-50 border border-violet-100 text-violet-600"
          />
          <NavCard
            href={`/voice-agent/${business.id}/customize`}
            icon={Sliders}
            label="Customization"
            desc="Branding, workflows, escalation rules, permissions"
            color="bg-emerald-50 border border-emerald-100 text-emerald-600"
          />
        </div>
      </div>

      {/* Incomplete setup warning */}
      {!business.onboarding_complete && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Setup incomplete</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Complete the profile and create the agent to go live.
              Use the Manage section above to finish setup.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
