"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic2, Volume2, Globe, Sparkles, Save, Check, RefreshCw, Play } from "lucide-react";
import type { BusinessWithAgent, ElevenLabsVoice } from "@/types/agent";
import AgentSyncButton from "./AgentSyncButton";

const PERSONALITIES = [
  { value: "professional", label: "Professional" },
  { value: "friendly",     label: "Friendly" },
  { value: "formal",       label: "Formal" },
  { value: "casual",       label: "Casual" },
  { value: "energetic",    label: "Energetic" },
  { value: "calm",         label: "Calm" },
];

const TONES = [
  { value: "helpful",    label: "Helpful" },
  { value: "assertive",  label: "Assertive" },
  { value: "empathetic", label: "Empathetic" },
  { value: "concise",    label: "Concise" },
  { value: "detailed",   label: "Detailed" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 4, hint, mono }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; hint?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none ${mono ? "font-mono text-xs" : ""}`}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step = 0.05 }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-violet-600">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

interface Props {
  business: BusinessWithAgent;
}

export default function AgentConfigClient({ business }: Props) {
  const router = useRouter();
  const agent  = business.agent;

  const [agentName,   setAgentName]   = useState(agent?.agent_name ?? `${business.business_name} Assistant`);
  const [personality, setPersonality] = useState(agent?.personality ?? "professional");
  const [tone,        setTone]        = useState(agent?.tone ?? "helpful");

  const [voices,         setVoices]         = useState<ElevenLabsVoice[]>([]);
  const [voicesLoading,  setVoicesLoading]  = useState(false);
  const [selectedVoice,  setSelectedVoice]  = useState(business.agent_voice_settings?.voice_id ?? "");
  const [stability,      setStability]      = useState(business.agent_voice_settings?.stability ?? 0.5);
  const [similarity,     setSimilarity]     = useState(business.agent_voice_settings?.similarity_boost ?? 0.75);
  const [speed,          setSpeed]          = useState(business.agent_voice_settings?.speed ?? 1.0);

  const [greetingEl, setGreetingEl] = useState(business.greeting_settings?.greeting_el ?? "");
  const [greetingEn, setGreetingEn] = useState(business.greeting_settings?.greeting_en ?? "");
  const [farewellEl, setFarewellEl] = useState(business.greeting_settings?.farewell_el ?? "");
  const [farewellEn, setFarewellEn] = useState(business.greeting_settings?.farewell_en ?? "");

  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "");

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [preview, setPreview] = useState<HTMLAudioElement | null>(null);

  // Load voices
  useEffect(() => {
    setVoicesLoading(true);
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVoices(data);
      })
      .catch(() => {})
      .finally(() => setVoicesLoading(false));
  }, []);

  function playPreview(url: string | null) {
    if (!url) return;
    if (preview) { preview.pause(); preview.currentTime = 0; }
    const audio = new Audio(url);
    audio.play();
    setPreview(audio);
  }

  async function save() {
    setSaving(true);
    const selectedVoiceObj = voices.find((v) => v.voice_id === selectedVoice);
    try {
      // Update agent settings
      await fetch(`/api/businesses/${business.id}/agent`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name:  agentName,
          personality,
          tone,
          voice_id:   selectedVoice || null,
          voice_name: selectedVoiceObj?.name ?? null,
        }),
      });

      // Update business voice + greeting settings
      await fetch(`/api/businesses/${business.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_voice_settings: {
            voice_id:         selectedVoice,
            voice_name:       selectedVoiceObj?.name ?? "",
            stability,
            similarity_boost: similarity,
            style:            0.0,
            speed,
          },
          greeting_settings: {
            greeting_el: greetingEl,
            greeting_en: greetingEn,
            farewell_el: farewellEl,
            farewell_en: farewellEn,
            on_hold_message: "Please hold for a moment...",
          },
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch { /* error handled by UI */ }
    finally { setSaving(false); }
  }

  const hasElevenLabsKey = true; // Checked server-side; client just shows the button

  return (
    <div className="space-y-5">
      {/* Agent identity */}
      <Section title="Agent Identity">
        <Input
          label="Agent Name"
          value={agentName}
          onChange={setAgentName}
          placeholder={`${business.business_name} Assistant`}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPersonality(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  personality === p.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  tone === t.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Voice selection */}
      <Section title="Voice">
        {voicesLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="w-4 h-4 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
            Loading voices...
          </div>
        ) : voices.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Could not load ElevenLabs voices. Make sure ELEVENLABS_API_KEY is set.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {voices.map((v) => (
              <div
                key={v.voice_id}
                onClick={() => setSelectedVoice(v.voice_id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  selectedVoice === v.voice_id
                    ? "border-violet-400 bg-violet-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{v.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{v.category}</p>
                  {v.labels && Object.keys(v.labels).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(v.labels).slice(0, 3).map(([k, val]) => (
                        <span key={k} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {v.preview_url && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); playPreview(v.preview_url); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Preview voice"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 grid sm:grid-cols-3 gap-4">
          <Slider label="Stability"   value={stability}  onChange={setStability}  min={0} max={1} />
          <Slider label="Similarity"  value={similarity} onChange={setSimilarity} min={0} max={1} />
          <Slider label="Speed"       value={speed}      onChange={setSpeed}      min={0.5} max={2.0} step={0.1} />
        </div>
      </Section>

      {/* Language & Greetings */}
      <Section title="Language & Greetings">
        <p className="text-xs text-gray-500 -mt-1">
          The agent automatically detects Greek or English and responds in the same language.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Textarea label="Greek greeting"  value={greetingEl} onChange={setGreetingEl} rows={2} />
          <Textarea label="English greeting" value={greetingEn} onChange={setGreetingEn} rows={2} />
          <Textarea label="Greek farewell"   value={farewellEl} onChange={setFarewellEl} rows={2} />
          <Textarea label="English farewell" value={farewellEn} onChange={setFarewellEn} rows={2} />
        </div>
      </Section>

      {/* System prompt preview */}
      {agent?.system_prompt && (
        <Section title="System Prompt Preview">
          <p className="text-xs text-gray-400 -mt-1">
            Auto-generated from your business data. Re-sync to update after making changes.
          </p>
          <div className="max-h-64 overflow-y-auto">
            <Textarea
              label=""
              value={agent.system_prompt}
              onChange={setSystemPrompt}
              rows={14}
              mono
              hint="This is what the AI agent receives as instructions. Edit carefully — changes here require a re-sync."
            />
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>

        <AgentSyncButton
          businessId={business.id}
          agentStatus={agent?.status}
          hasElevenLabs={hasElevenLabsKey}
        />
      </div>
    </div>
  );
}
