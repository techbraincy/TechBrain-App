"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Plus, Trash2, Palette, Settings2, ShieldAlert, Lock } from "lucide-react";
import type { BusinessWithAgent, EscalationRules, WorkflowSettings, CustomPermissions, BrandingSettings } from "@/types/agent";
import {
  DEFAULT_ESCALATION_RULES, DEFAULT_BRANDING, DEFAULT_WORKFLOW, DEFAULT_PERMISSIONS,
} from "@/types/agent";

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(" "); }

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Icon className="w-4 h-4 text-violet-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  );
}

function NumberInput({ value, onChange, min, max, label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min} max={max}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={cn("w-10 h-6 rounded-full transition-colors", checked ? "bg-violet-600" : "bg-gray-200")} />
        <div className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
    </label>
  );
}

function TagList({ items, onAdd, onRemove, placeholder }: {
  items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !items.includes(v)) { onAdd(v); setInput(""); }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full">
            {item}
            <button type="button" onClick={() => onRemove(item)} className="hover:text-red-600 transition-colors ml-0.5">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 px-3.5 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <button type="button" onClick={add}
          className="px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

interface Props { business: BusinessWithAgent }

export default function CustomizeClient({ business }: Props) {
  const router = useRouter();

  // Branding
  const [branding, setBranding] = useState<BrandingSettings>({
    ...DEFAULT_BRANDING,
    ...(business.branding_settings ?? {}),
  });

  // Escalation
  const [escalation, setEscalation] = useState<EscalationRules>({
    ...DEFAULT_ESCALATION_RULES,
    ...(business.escalation_rules ?? {}),
  });

  // Workflow
  const [workflow, setWorkflow] = useState<WorkflowSettings>({
    ...DEFAULT_WORKFLOW,
    ...(business.workflow_settings ?? {}),
  });

  // Permissions
  const [perms, setPerms] = useState<CustomPermissions>({
    ...DEFAULT_PERMISSIONS,
    ...(business.custom_permissions ?? {}),
  });

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  function updateBranding(key: keyof BrandingSettings, val: string | null) {
    setBranding((b) => ({ ...b, [key]: val }));
  }
  function updateEsc(key: keyof EscalationRules, val: unknown) {
    setEscalation((e) => ({ ...e, [key]: val }));
  }
  function updateWf(key: keyof WorkflowSettings, val: unknown) {
    setWorkflow((w) => ({ ...w, [key]: val }));
  }
  function updatePerms(key: keyof CustomPermissions, val: unknown) {
    setPerms((p) => ({ ...p, [key]: val }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding_settings:  branding,
          escalation_rules:   escalation,
          workflow_settings:  workflow,
          custom_permissions: perms,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Branding */}
      <Section title="Branding" icon={Palette}>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Primary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={branding.primary_color} onChange={(e) => updateBranding("primary_color", e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input type="text" value={branding.primary_color} onChange={(e) => updateBranding("primary_color", e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" placeholder="#8B5CF6" />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={branding.secondary_color} onChange={(e) => updateBranding("secondary_color", e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input type="text" value={branding.secondary_color} onChange={(e) => updateBranding("secondary_color", e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" placeholder="#6366F1" />
            </div>
          </Field>
          <Field label="Accent Color">
            <div className="flex items-center gap-2">
              <input type="color" value={branding.accent_color} onChange={(e) => updateBranding("accent_color", e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input type="text" value={branding.accent_color} onChange={(e) => updateBranding("accent_color", e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" placeholder="#F59E0B" />
            </div>
          </Field>
        </div>
        {/* Color preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: branding.primary_color }} />
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: branding.secondary_color }} />
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: branding.accent_color }} />
          <p className="text-xs text-gray-400">Preview of your brand colors</p>
        </div>
      </Section>

      {/* Workflow */}
      <Section title="Workflow Settings" icon={Settings2}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle
            label="Require booking confirmation"
            desc="Agent always confirms booking details"
            checked={workflow.require_confirmation_for_bookings}
            onChange={(v) => updateWf("require_confirmation_for_bookings", v)}
          />
          <Toggle
            label="Require order confirmation"
            desc="Agent confirms orders before accepting"
            checked={workflow.require_confirmation_for_orders}
            onChange={(v) => updateWf("require_confirmation_for_orders", v)}
          />
          <Toggle
            label="SMS confirmation"
            desc="Send SMS after bookings/orders"
            checked={workflow.send_sms_confirmation}
            onChange={(v) => updateWf("send_sms_confirmation", v)}
          />
        </div>

        {workflow.send_sms_confirmation && (
          <Field label="SMS confirmation number">
            <Input
              value={workflow.sms_confirmation_number ?? ""}
              onChange={(v) => updateWf("sms_confirmation_number", v || null)}
              placeholder="+30 210 1234567"
              type="tel"
            />
          </Field>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberInput label="Booking lead time (hours)" value={workflow.booking_lead_time_hours} onChange={(v) => updateWf("booking_lead_time_hours", v)} min={0} max={72} />
          <NumberInput label="Max party size" value={workflow.max_party_size} onChange={(v) => updateWf("max_party_size", v)} min={1} max={500} />
          <NumberInput label="Cancellation window (hours)" value={workflow.cancellation_window_hours} onChange={(v) => updateWf("cancellation_window_hours", v)} min={0} max={72} />
          <NumberInput label="Delivery radius (km)" value={workflow.delivery_radius_km} onChange={(v) => updateWf("delivery_radius_km", v)} min={0} max={100} />
          <Field label="Delivery fee (€)">
            <Input value={workflow.delivery_fee} onChange={(v) => updateWf("delivery_fee", v)} placeholder="2.00" />
          </Field>
          <Field label="Min order value (€)">
            <Input value={workflow.min_order_value} onChange={(v) => updateWf("min_order_value", v)} placeholder="15.00" />
          </Field>
        </div>
      </Section>

      {/* Escalation */}
      <Section title="Escalation Rules" icon={ShieldAlert}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle
            label="Escalate on complaints"
            desc="Hand off to human when customer complains"
            checked={escalation.escalate_on_complaint}
            onChange={(v) => updateEsc("escalate_on_complaint", v)}
          />
          <Toggle
            label="Escalate on special requests"
            desc="Hand off for requests outside capabilities"
            checked={escalation.escalate_on_special_request}
            onChange={(v) => updateEsc("escalate_on_special_request", v)}
          />
        </div>

        <Field label="Human handoff phone number" hint="The agent gives this number to customers when escalating">
          <Input
            value={escalation.human_handoff_number}
            onChange={(v) => updateEsc("human_handoff_number", v)}
            placeholder="+30 210 1234567"
            type="tel"
          />
        </Field>

        <NumberInput
          label="Max failed attempts before escalation"
          value={escalation.max_failed_attempts}
          onChange={(v) => updateEsc("max_failed_attempts", v)}
          min={1} max={10}
        />

        <Field label="Escalation trigger keywords" hint="If the customer uses any of these words, escalate immediately">
          <TagList
            items={escalation.escalation_triggers}
            onAdd={(v) => updateEsc("escalation_triggers", [...escalation.escalation_triggers, v])}
            onRemove={(v) => updateEsc("escalation_triggers", escalation.escalation_triggers.filter((t) => t !== v))}
            placeholder="e.g. lawyer, refund, emergency"
          />
        </Field>
      </Section>

      {/* Permissions */}
      <Section title="Agent Permissions" icon={Lock}>
        <div className="grid sm:grid-cols-3 gap-4">
          <Toggle label="Can book" checked={perms.can_book} onChange={(v) => updatePerms("can_book", v)} />
          <Toggle label="Can order" checked={perms.can_order} onChange={(v) => updatePerms("can_order", v)} />
          <Toggle label="Can cancel" checked={perms.can_cancel} onChange={(v) => updatePerms("can_cancel", v)} />
        </div>

        <Field label="Allowed additional actions">
          <TagList
            items={perms.allowed_actions}
            onAdd={(v) => updatePerms("allowed_actions", [...perms.allowed_actions, v])}
            onRemove={(v) => updatePerms("allowed_actions", perms.allowed_actions.filter((a) => a !== v))}
            placeholder="e.g. provide menu prices"
          />
        </Field>

        <Field label="Blocked topics" hint="The agent will refuse to discuss these topics">
          <TagList
            items={perms.blocked_topics}
            onAdd={(v) => updatePerms("blocked_topics", [...perms.blocked_topics, v])}
            onRemove={(v) => updatePerms("blocked_topics", perms.blocked_topics.filter((t) => t !== v))}
            placeholder="e.g. competitor pricing, politics"
          />
        </Field>
      </Section>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}
