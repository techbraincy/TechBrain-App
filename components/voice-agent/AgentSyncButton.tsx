"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  businessId:    string;
  agentStatus:   string | undefined;
  hasElevenLabs: boolean;
}

export default function AgentSyncButton({ businessId, agentStatus, hasElevenLabs }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; message: string } | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/agent/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: "Agent synced successfully!" });
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? "Sync failed" });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const isActive = agentStatus === "active";
  const isError  = agentStatus === "error";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={sync}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {isActive ? "Re-syncing..." : "Creating agent..."}
          </>
        ) : isActive ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Re-sync Agent
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {isError ? "Retry Agent Creation" : "Create Agent on ElevenLabs"}
          </>
        )}
      </button>

      {result && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
          result.ok
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {result.message}
        </div>
      )}

      {!hasElevenLabs && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ ELEVENLABS_API_KEY is not configured. Set it in your environment variables to create agents.
        </p>
      )}
    </div>
  );
}
