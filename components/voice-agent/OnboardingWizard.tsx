"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, Building2, Clock, Utensils,
  Settings2, Mic2, Globe, Sparkles, Plus, Trash2, MapPin,
  Phone, Link as LinkIcon, BookOpen, Package, Bike, Coffee
} from "lucide-react";
import type {
  BusinessCategory, DayOfWeek, DayHours, ServiceItem, FAQItem,
} from "@/types/agent";
import {
  BUSINESS_CATEGORIES, DEFAULT_OPENING_HOURS,
} from "@/types/agent";
import PhoneInput from "@/components/voice-agent/PhoneInput";
import LocationPickerInput from "@/components/voice-agent/LocationPickerInput";

// ── Helpers ───────────────────────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
  { key: "sunday",    label: "Sun" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface WizardData {
  // Step 1
  business_name:     string;
  business_category: BusinessCategory;
  phone_number:      string;
  address:           string;
  google_maps_link:  string;
  // Step 2
  opening_hours: Record<DayOfWeek, DayHours>;
  // Step 3
  services:     ServiceItem[];
  menu_catalog: ServiceItem[];
  // Step 4 — capabilities
  reservation_enabled: boolean;
  meetings_enabled:    boolean;
  delivery_enabled:    boolean;
  takeaway_enabled:    boolean;
  faq:                 FAQItem[];
  // Step 4 — workflow settings
  max_party_size:            string;
  booking_lead_time_hours:   string;
  cancellation_window_hours: string;
  avg_prep_time_minutes:     string;
  avg_delivery_time_minutes: string;
  delivery_fee:              string;
  min_order_value:           string;
  delivery_radius_km:        string;
  // Step 5
  custom_agent_instructions: string;
  escalation_human_number:   string;
  // Step 6
  agent_name:    string;
  personality:   string;
  tone:          string;
  greeting_el:   string;
  greeting_en:   string;
  farewell_el:   string;
  farewell_en:   string;
}

const PERSONALITIES = [
  { value: "professional", label: "Professional", desc: "Formal and business-like" },
  { value: "friendly",     label: "Friendly",     desc: "Warm and approachable" },
  { value: "formal",       label: "Formal",       desc: "Very structured and polite" },
  { value: "casual",       label: "Casual",       desc: "Relaxed and conversational" },
  { value: "energetic",    label: "Energetic",    desc: "Enthusiastic and upbeat" },
  { value: "calm",         label: "Calm",         desc: "Gentle and reassuring" },
];

const TONES = [
  { value: "helpful",    label: "Helpful",    desc: "Focus on solving problems" },
  { value: "assertive",  label: "Assertive",  desc: "Confident and direct" },
  { value: "empathetic", label: "Empathetic", desc: "Sensitive and understanding" },
  { value: "concise",    label: "Concise",    desc: "Short, to-the-point answers" },
  { value: "detailed",   label: "Detailed",   desc: "Thorough explanations" },
];

const STEPS = [
  { id: 1, label: "Business",   icon: Building2 },
  { id: 2, label: "Hours",      icon: Clock },
  { id: 3, label: "Services",   icon: Utensils },
  { id: 4, label: "Capabilities",icon: Settings2 },
  { id: 5, label: "Rules",      icon: BookOpen },
  { id: 6, label: "Agent",      icon: Mic2 },
  { id: 7, label: "Review",     icon: Sparkles },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Input({ label, value, onChange, placeholder, type = "text", error, hint, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; error?: string; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl outline-none transition-all",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        )}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={cn(
          "w-10 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-violet-600" : "bg-gray-200"
        )} />
        <div className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
    </label>
  );
}

// ── Step 1: Business Info ─────────────────────────────────────────────────────
function Step1({ data, onChange, errors }: {
  data: WizardData;
  onChange: (key: keyof WizardData, val: unknown) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BUSINESS_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => onChange("business_category", cat.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all",
                data.business_category === cat.value
                  ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Business Name"
        value={data.business_name}
        onChange={(v) => onChange("business_name", v)}
        placeholder="e.g. Café Kosta, Dr. Papadopoulos Clinic"
        error={errors.business_name}
        required
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
          <PhoneInput
            value={data.phone_number}
            onChange={(v) => onChange("phone_number", v)}
          />
        </div>
        <Input
          label="Address"
          value={data.address}
          onChange={(v) => onChange("address", v)}
          placeholder="123 Main St, Athens"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
        <LocationPickerInput
          value={data.google_maps_link}
          onChange={(v) => onChange("google_maps_link", v)}
          businessName={data.business_name}
        />
      </div>
    </div>
  );
}

// ── Step 2: Opening Hours ─────────────────────────────────────────────────────
function Step2({ data, onChange }: {
  data: WizardData;
  onChange: (key: keyof WizardData, val: unknown) => void;
}) {
  function updateDay(day: DayOfWeek, field: keyof DayHours, value: string | boolean) {
    onChange("opening_hours", {
      ...data.opening_hours,
      [day]: { ...data.opening_hours[day], [field]: value },
    });
  }

  function copyToAll(day: DayOfWeek) {
    const source = data.opening_hours[day];
    const newHours = { ...data.opening_hours };
    DAYS.forEach((d) => { newHours[d.key] = { ...source }; });
    onChange("opening_hours", newHours);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Set your regular opening hours. You can add holiday/exception hours later.
      </p>
      {DAYS.map(({ key, label }) => {
        const h = data.opening_hours[key] ?? { open: "09:00", close: "21:00", closed: false };
        return (
          <div key={key} className={cn(
            "flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            h.closed ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"
          )}>
            <span className="w-10 text-sm font-medium text-gray-700">{label}</span>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={h.closed}
                onChange={(e) => updateDay(key, "closed", e.target.checked)}
                className="w-3.5 h-3.5 accent-violet-600"
              />
              <span className="text-xs text-gray-500">Closed</span>
            </label>

            {!h.closed && (
              <>
                <input
                  type="time"
                  value={h.open}
                  onChange={(e) => updateDay(key, "open", e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-violet-400"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="time"
                  value={h.close}
                  onChange={(e) => updateDay(key, "close", e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={() => copyToAll(key)}
                  className="text-xs text-violet-500 hover:text-violet-700 ml-auto"
                >
                  Copy to all
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 3: Services / Menu ───────────────────────────────────────────────────
function Step3({ data, onChange }: {
  data: WizardData;
  onChange: (key: keyof WizardData, val: unknown) => void;
}) {
  const isFood = ["restaurant", "cafe"].includes(data.business_category);
  const listKey = isFood ? "menu_catalog" : "services";
  const items: ServiceItem[] = isFood ? data.menu_catalog : data.services;

  function addItem() {
    onChange(listKey, [...items, { id: crypto.randomUUID(), name: "", description: "", price: "", category: "" }]);
  }

  function updateItem(id: string, field: keyof ServiceItem, value: string) {
    onChange(listKey, items.map((i) => i.id === id ? { ...i, [field]: value } : i));
  }

  function removeItem(id: string) {
    onChange(listKey, items.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isFood ? "Add menu items or categories. Leave price blank for market price." : "List the services your business offers."}
        </p>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
      </div>

      {items.length === 0 && (
        <button
          type="button"
          onClick={addItem}
          className="w-full flex flex-col items-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-violet-200 hover:text-violet-400 transition-colors"
        >
          <Plus className="w-6 h-6 mb-2" />
          <span className="text-sm">Add your first {isFood ? "menu item" : "service"}</span>
        </button>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                label="Name"
                value={item.name}
                onChange={(v) => updateItem(item.id, "name", v)}
                placeholder={isFood ? "Espresso" : "Consultation"}
                required
              />
              <Input
                label="Category"
                value={item.category}
                onChange={(v) => updateItem(item.id, "category", v)}
                placeholder={isFood ? "Coffee" : "Medical"}
              />
              <Input
                label="Price (€)"
                value={item.price}
                onChange={(v) => updateItem(item.id, "price", v)}
                placeholder="2.50"
              />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(v) => updateItem(item.id, "description", v)}
                  placeholder="Short description..."
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="mt-6 p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Capabilities ──────────────────────────────────────────────────────
function Step4({ data, onChange }: {
  data: WizardData;
  onChange: (key: keyof WizardData, val: unknown) => void;
}) {
  function addFAQ() {
    onChange("faq", [...data.faq, { id: crypto.randomUUID(), question: "", answer: "" }]);
  }
  function updateFAQ(id: string, field: "question" | "answer", value: string) {
    onChange("faq", data.faq.map((f) => f.id === id ? { ...f, [field]: value } : f));
  }
  function removeFAQ(id: string) {
    onChange("faq", data.faq.filter((f) => f.id !== id));
  }

  const hasOrdering     = data.delivery_enabled || data.takeaway_enabled;
  const hasReservations = data.reservation_enabled || data.meetings_enabled;

  return (
    <div className="space-y-6">
      {/* Capabilities */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">What can the agent handle?</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle
            label="Table Reservations"
            desc="Accept reservations over the phone"
            checked={data.reservation_enabled}
            onChange={(v) => onChange("reservation_enabled", v)}
          />
          <Toggle
            label="Appointments / Meetings"
            desc="Schedule appointments with clients"
            checked={data.meetings_enabled}
            onChange={(v) => onChange("meetings_enabled", v)}
          />
          <Toggle
            label="Delivery Orders"
            desc="Take delivery orders by phone"
            checked={data.delivery_enabled}
            onChange={(v) => onChange("delivery_enabled", v)}
          />
          <Toggle
            label="Takeaway Orders"
            desc="Take takeaway / click & collect orders"
            checked={data.takeaway_enabled}
            onChange={(v) => onChange("takeaway_enabled", v)}
          />
        </div>
      </div>

      {/* Reservation settings */}
      {hasReservations && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">Reservation Settings</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Max party size"
              value={data.max_party_size}
              onChange={(v) => onChange("max_party_size", v)}
              placeholder="20"
              type="number"
              hint="Maximum guests per booking"
            />
            <Input
              label="Advance notice (hours)"
              value={data.booking_lead_time_hours}
              onChange={(v) => onChange("booking_lead_time_hours", v)}
              placeholder="1"
              type="number"
              hint="Min hours before booking"
            />
            <Input
              label="Cancellation window (hours)"
              value={data.cancellation_window_hours}
              onChange={(v) => onChange("cancellation_window_hours", v)}
              placeholder="2"
              type="number"
              hint="Min hours before to cancel"
            />
          </div>
        </div>
      )}

      {/* Order settings */}
      {hasOrdering && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">Order Settings</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Avg prep time (minutes)"
              value={data.avg_prep_time_minutes}
              onChange={(v) => onChange("avg_prep_time_minutes", v)}
              placeholder="20"
              type="number"
              hint="Agent tells customers this estimate"
            />
            {data.delivery_enabled && (
              <Input
                label="Avg delivery time (minutes)"
                value={data.avg_delivery_time_minutes}
                onChange={(v) => onChange("avg_delivery_time_minutes", v)}
                placeholder="30"
                type="number"
                hint="Added on top of prep time"
              />
            )}
            {data.delivery_enabled && (
              <Input
                label="Delivery fee (€)"
                value={data.delivery_fee}
                onChange={(v) => onChange("delivery_fee", v)}
                placeholder="2.00"
                hint="Leave blank if free"
              />
            )}
            {data.delivery_enabled && (
              <Input
                label="Min order value (€)"
                value={data.min_order_value}
                onChange={(v) => onChange("min_order_value", v)}
                placeholder="10.00"
                hint="Leave blank if no minimum"
              />
            )}
            {data.delivery_enabled && (
              <Input
                label="Delivery radius (km)"
                value={data.delivery_radius_km}
                onChange={(v) => onChange("delivery_radius_km", v)}
                placeholder="5"
                hint="Leave blank if no restriction"
              />
            )}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Frequently Asked Questions</h3>
            <p className="text-xs text-gray-400 mt-0.5">The agent will use these to answer common questions</p>
          </div>
          <button
            type="button"
            onClick={addFAQ}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>
        </div>

        <div className="space-y-3">
          {data.faq.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    label="Question"
                    value={item.question}
                    onChange={(v) => updateFAQ(item.id, "question", v)}
                    placeholder="Do you have parking?"
                  />
                  <Textarea
                    label="Answer"
                    value={item.answer}
                    onChange={(v) => updateFAQ(item.id, "answer", v)}
                    placeholder="Yes, there is free parking in front of the building."
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFAQ(item.id)}
                  className="mt-6 p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {data.faq.length === 0 && (
            <button
              type="button"
              onClick={addFAQ}
              className="w-full flex flex-col items-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-violet-200 hover:text-violet-400 transition-colors"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-sm">Add a FAQ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Rules & Instructions ──────────────────────────────────────────────
function Step5({ data, onChange }: {
  data: WizardData;
  onChange: (key: keyof WizardData, val: unknown) => void;
}) {
  return (
    <div className="space-y-5">
      <Textarea
        label="Custom Agent Instructions"
        value={data.custom_agent_instructions}
        onChange={(v) => onChange("custom_agent_instructions", v)}
        placeholder="e.g. Always mention our happy hour from 5-7pm. Never quote prices over the phone without checking availability first. If a customer asks about our private dining room, mention it seats up to 20 people..."
        rows={5}
        hint="These instructions are added directly to the agent's system prompt. Be specific."
      />
      <Input
        label="Human Escalation Phone Number"
        value={data.escalation_human_number}
        onChange={(v) => onChange("escalation_human_number", v)}
        placeholder="+30 210 1234567"
        hint="The agent will give customers this number when it can't help or escalation is needed"
      />
    </div>
  );
}

// ── Step 6: Agent Personality ─────────────────────────────────────────────────
function Step6({ data, onChange }: {
  data: WizardData;
  onChange: (key: keyof WizardData, val: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <Input
        label="Agent Name"
        value={data.agent_name}
        onChange={(v) => onChange("agent_name", v)}
        placeholder={`${data.business_name || "My Business"} Assistant`}
        hint="This is the name the agent uses to introduce itself"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
        <div className="grid sm:grid-cols-3 gap-2">
          {PERSONALITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange("personality", p.value)}
              className={cn(
                "text-left px-3 py-2.5 rounded-xl border text-sm transition-all",
                data.personality === p.value
                  ? "border-violet-400 bg-violet-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <p className="font-medium text-gray-800">{p.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
        <div className="grid sm:grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange("tone", t.value)}
              className={cn(
                "text-left px-3 py-2.5 rounded-xl border text-sm transition-all",
                data.tone === t.value
                  ? "border-violet-400 bg-violet-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <p className="font-medium text-gray-800">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Textarea
          label="Greek greeting"
          value={data.greeting_el}
          onChange={(v) => onChange("greeting_el", v)}
          rows={2}
          hint="What the agent says first in Greek"
        />
        <Textarea
          label="English greeting"
          value={data.greeting_en}
          onChange={(v) => onChange("greeting_en", v)}
          rows={2}
          hint="What the agent says first in English"
        />
        <Textarea
          label="Greek farewell"
          value={data.farewell_el}
          onChange={(v) => onChange("farewell_el", v)}
          rows={2}
        />
        <Textarea
          label="English farewell"
          value={data.farewell_en}
          onChange={(v) => onChange("farewell_en", v)}
          rows={2}
        />
      </div>
    </div>
  );
}

// ── Step 7: Review ────────────────────────────────────────────────────────────
function Step7({ data }: { data: WizardData }) {
  const cat = BUSINESS_CATEGORIES.find((c) => c.value === data.business_category);

  const capItems = [
    data.reservation_enabled && "Reservations",
    data.meetings_enabled    && "Appointments",
    data.delivery_enabled    && "Delivery",
    data.takeaway_enabled    && "Takeaway",
  ].filter(Boolean) as string[];

  function Row({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
      <div className="flex gap-3">
        <span className="text-sm text-gray-400 w-32 flex-shrink-0">{label}</span>
        <span className="text-sm text-gray-800">{value}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{cat?.emoji}</span>
          <div>
            <p className="font-bold text-gray-900">{data.business_name}</p>
            <p className="text-xs text-violet-700">{cat?.label}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Row label="Phone"    value={data.phone_number} />
          <Row label="Address"  value={data.address} />
          <Row label="Agent"    value={data.agent_name} />
          <Row label="Personality" value={data.personality} />
        </div>
        {capItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {capItems.map((c) => (
              <span key={c} className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Greeting preview</p>
        <p className="text-sm text-gray-800 italic">"{data.greeting_el}"</p>
        <p className="text-sm text-gray-400 italic">"{data.greeting_en}"</p>
      </div>

      <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <strong className="text-amber-800">After setup:</strong> We'll create your ElevenLabs agent automatically.
        You can then pick a voice, refine instructions, and further customize everything from the dashboard.
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [loading, setLoading]       = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const [data, setData] = useState<WizardData>({
    business_name:     "",
    business_category: "restaurant",
    phone_number:      "",
    address:           "",
    google_maps_link:  "",
    opening_hours:     DEFAULT_OPENING_HOURS as Record<DayOfWeek, DayHours>,
    services:          [],
    menu_catalog:      [],
    reservation_enabled: false,
    meetings_enabled:    false,
    delivery_enabled:    false,
    takeaway_enabled:    false,
    faq:               [],
    max_party_size:            "20",
    booking_lead_time_hours:   "1",
    cancellation_window_hours: "2",
    avg_prep_time_minutes:     "20",
    avg_delivery_time_minutes: "30",
    delivery_fee:              "",
    min_order_value:           "",
    delivery_radius_km:        "",
    custom_agent_instructions: "",
    escalation_human_number:  "",
    agent_name:    "",
    personality:   "professional",
    tone:          "helpful",
    greeting_el:   "Ναι παρακαλώ;",
    greeting_en:   "Hello, how can I help you?",
    farewell_el:   "Ευχαριστούμε! Καλή συνέχεια!",
    farewell_en:   "Thank you for calling! Have a great day!",
  });

  const onChange = useCallback((key: keyof WizardData, val: unknown) => {
    setData((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-set agent name if not customized
      if (key === "business_name" && (prev.agent_name === "" || prev.agent_name === `${prev.business_name} Assistant`)) {
        next.agent_name = val ? `${val} Assistant` : "";
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }, [errors]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!data.business_name.trim()) newErrors.business_name = "Business name is required";
    }
    if (step === 6) {
      if (!data.agent_name.trim()) newErrors.agent_name = "Agent name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function next() {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, 7));
  }

  function back() { setStep((s) => Math.max(s - 1, 1)); }

  async function submit() {
    if (!validate()) return;
    setLoading(true);

    try {
      // 1. Create the business record
      setLoadingStep("Creating business...");
      const res = await fetch("/api/businesses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name:     data.business_name,
          business_category: data.business_category,
          phone_number:      data.phone_number || undefined,
          address:           data.address || undefined,
          google_maps_link:  data.google_maps_link || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create business");
      }
      const business = await res.json();

      // Build workflow_settings from form data
      const workflow_settings: Record<string, unknown> = {
        auto_accept_orders:           false,
        require_confirmation_for_orders:   true,
        require_confirmation_for_bookings: true,
      };
      if (data.max_party_size)            workflow_settings.max_party_size            = Number(data.max_party_size);
      if (data.booking_lead_time_hours)   workflow_settings.booking_lead_time_hours   = Number(data.booking_lead_time_hours);
      if (data.cancellation_window_hours) workflow_settings.cancellation_window_hours = Number(data.cancellation_window_hours);
      if (data.avg_prep_time_minutes)     workflow_settings.avg_prep_time_minutes     = Number(data.avg_prep_time_minutes);
      if (data.avg_delivery_time_minutes) workflow_settings.avg_delivery_time_minutes = Number(data.avg_delivery_time_minutes);
      if (data.delivery_fee)              workflow_settings.delivery_fee              = data.delivery_fee;
      if (data.min_order_value)           workflow_settings.min_order_value           = data.min_order_value;
      if (data.delivery_radius_km)        workflow_settings.delivery_radius_km        = Number(data.delivery_radius_km);

      // 2. Update with full details
      setLoadingStep("Saving configuration...");
      await fetch(`/api/businesses/${business.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opening_hours:            data.opening_hours,
          services:                 data.services,
          menu_catalog:             data.menu_catalog,
          faq:                      data.faq,
          reservation_enabled:      data.reservation_enabled,
          meetings_enabled:         data.meetings_enabled,
          delivery_enabled:         data.delivery_enabled,
          takeaway_enabled:         data.takeaway_enabled,
          workflow_settings,
          custom_agent_instructions: data.custom_agent_instructions || null,
          escalation_rules: {
            escalate_on_complaint:       true,
            escalate_on_special_request: true,
            human_handoff_number:        data.escalation_human_number || null,
            escalation_triggers:         ["angry", "complaint", "emergency", "legal"],
            max_failed_attempts:         3,
          },
          greeting_settings: {
            greeting_el:     data.greeting_el,
            greeting_en:     data.greeting_en,
            farewell_el:     data.farewell_el,
            farewell_en:     data.farewell_en,
            on_hold_message: "Please hold for a moment...",
          },
          onboarding_step: 7,
        }),
      });

      // 3. Update agent settings
      await fetch(`/api/businesses/${business.id}/agent`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name:  data.agent_name,
          personality: data.personality,
          tone:        data.tone,
        }),
      });

      // 4. Sync the ElevenLabs agent (creates it automatically)
      setLoadingStep("Creating AI agent...");
      const syncRes = await fetch(`/api/businesses/${business.id}/agent/sync`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!syncRes.ok) {
        // Non-fatal — agent can be synced manually from the dashboard
        console.warn("[onboarding] Agent sync failed:", await syncRes.text());
      }

      // 5. Redirect to the business page
      router.push(`/voice-agent/${business.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrors({ submit: msg });
      setLoading(false);
      setLoadingStep("");
    }
  }

  const currentStep = STEPS[step - 1];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center gap-0 mb-4">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                disabled={s.id > step}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all text-xs font-bold",
                  s.id < step
                    ? "bg-violet-600 border-violet-600 text-white cursor-pointer"
                    : s.id === step
                    ? "bg-white border-violet-600 text-violet-600"
                    : "bg-white border-gray-200 text-gray-300 cursor-default"
                )}
              >
                {s.id < step ? <Check className="w-3.5 h-3.5" /> : s.id}
              </button>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 transition-colors",
                  s.id < step ? "bg-violet-600" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs text-gray-400">Step {step} of {STEPS.length}</p>
          <h2 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <currentStep.icon className="w-5 h-5 text-violet-600" />
            {currentStep.label === "Business"     ? "Business Information" :
             currentStep.label === "Hours"        ? "Opening Hours" :
             currentStep.label === "Services"     ? "Services & Menu" :
             currentStep.label === "Capabilities" ? "Capabilities & FAQ" :
             currentStep.label === "Rules"        ? "Instructions & Rules" :
             currentStep.label === "Agent"        ? "Agent Personality" :
             "Review & Create"}
          </h2>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6"
           style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {step === 1 && <Step1 data={data} onChange={onChange} errors={errors} />}
        {step === 2 && <Step2 data={data} onChange={onChange} />}
        {step === 3 && <Step3 data={data} onChange={onChange} />}
        {step === 4 && <Step4 data={data} onChange={onChange} />}
        {step === 5 && <Step5 data={data} onChange={onChange} />}
        {step === 6 && <Step6 data={data} onChange={onChange} />}
        {step === 7 && <Step7 data={data} />}
      </div>

      {errors.submit && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {errors.submit}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 7 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {loadingStep || "Creating..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create &amp; Launch Agent
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
