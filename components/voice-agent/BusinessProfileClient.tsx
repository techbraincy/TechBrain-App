"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Plus, Trash2 } from "lucide-react";
import type { BusinessWithAgent, DayOfWeek, DayHours, ServiceItem, FAQItem } from "@/types/agent";
import { BUSINESS_CATEGORIES, DEFAULT_OPENING_HOURS } from "@/types/agent";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
  { key: "saturday",  label: "Saturday" },
  { key: "sunday",    label: "Sunday" },
];

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(" "); }

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
    />
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

interface Props { business: BusinessWithAgent }

export default function BusinessProfileClient({ business }: Props) {
  const router = useRouter();

  // Basic info
  const [name,      setName]      = useState(business.business_name);
  const [category,  setCategory]  = useState(business.business_category);
  const [phone,     setPhone]     = useState(business.phone_number ?? "");
  const [address,   setAddress]   = useState(business.address ?? "");
  const [mapsLink,  setMapsLink]  = useState(business.google_maps_link ?? "");
  const [area,      setArea]      = useState(business.service_area ?? "");

  // Hours
  const [hours, setHours] = useState<Record<DayOfWeek, DayHours>>(
    (business.opening_hours as Record<DayOfWeek, DayHours>) ?? DEFAULT_OPENING_HOURS
  );

  // Services & menu
  const [services,  setServices]  = useState<ServiceItem[]>(business.services  ?? []);
  const [menu,      setMenu]      = useState<ServiceItem[]>(business.menu_catalog ?? []);
  const [faq,       setFaq]       = useState<FAQItem[]>(business.faq ?? []);

  // Capabilities
  const [resEnabled,  setResEnabled]  = useState(business.reservation_enabled);
  const [meetEnabled, setMeetEnabled] = useState(business.meetings_enabled);
  const [delEnabled,  setDelEnabled]  = useState(business.delivery_enabled);
  const [takeEnabled, setTakeEnabled] = useState(business.takeaway_enabled);

  // Custom instructions
  const [instructions, setInstructions] = useState(business.custom_agent_instructions ?? "");

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  function updateHour(day: DayOfWeek, field: keyof DayHours, value: string | boolean) {
    setHours((h) => ({ ...h, [day]: { ...h[day], [field]: value } }));
  }

  // Services helpers
  function addItem(type: "services" | "menu") {
    const item = { id: crypto.randomUUID(), name: "", description: "", price: "", category: "" };
    if (type === "services") setServices((s) => [...s, item]);
    else setMenu((m) => [...m, item]);
  }
  function updateItem(type: "services" | "menu", id: string, field: keyof ServiceItem, val: string) {
    const update = (arr: ServiceItem[]) => arr.map((i) => i.id === id ? { ...i, [field]: val } : i);
    if (type === "services") setServices(update);
    else setMenu(update);
  }
  function removeItem(type: "services" | "menu", id: string) {
    if (type === "services") setServices((s) => s.filter((i) => i.id !== id));
    else setMenu((m) => m.filter((i) => i.id !== id));
  }

  // FAQ helpers
  function addFAQ() { setFaq((f) => [...f, { id: crypto.randomUUID(), question: "", answer: "" }]); }
  function updateFAQ(id: string, field: "question" | "answer", val: string) {
    setFaq((f) => f.map((i) => i.id === id ? { ...i, [field]: val } : i));
  }
  function removeFAQ(id: string) { setFaq((f) => f.filter((i) => i.id !== id)); }

  async function save() {
    if (!name.trim()) { setError("Business name is required"); return; }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name:            name,
          business_category:        category,
          phone_number:             phone  || null,
          address:                  address || null,
          google_maps_link:         mapsLink || null,
          service_area:             area || null,
          opening_hours:            hours,
          services,
          menu_catalog:             menu,
          faq,
          reservation_enabled:      resEnabled,
          meetings_enabled:         meetEnabled,
          delivery_enabled:         delEnabled,
          takeaway_enabled:         takeEnabled,
          custom_agent_instructions: instructions || null,
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

  const isFood = ["restaurant", "cafe"].includes(category);

  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <Section title="Basic Information">
        <Field label="Business Type">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BUSINESS_CATEGORIES.map((cat) => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value as typeof category)}
                className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all",
                  category === cat.value ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                )}>
                <span className="text-base">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Business Name">
          <Input value={name} onChange={setName} placeholder="Café Kosta" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone Number"><Input value={phone} onChange={setPhone} placeholder="+30 210..." type="tel" /></Field>
          <Field label="Address"><Input value={address} onChange={setAddress} placeholder="123 Main St, Athens" /></Field>
        </div>
        <Field label="Google Maps Link"><Input value={mapsLink} onChange={setMapsLink} placeholder="https://maps.google.com/..." /></Field>
        <Field label="Service Area (for delivery)"><Input value={area} onChange={setArea} placeholder="e.g. Central Athens, up to 5km" /></Field>
      </Section>

      {/* Opening Hours */}
      <Section title="Opening Hours">
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const h = hours[key] ?? { open: "09:00", close: "21:00", closed: false };
            return (
              <div key={key} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border",
                h.closed ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200")}>
                <span className="w-24 text-sm font-medium text-gray-700">{label}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={h.closed} onChange={(e) => updateHour(key, "closed", e.target.checked)} className="w-3.5 h-3.5 accent-violet-600" />
                  <span className="text-xs text-gray-500">Closed</span>
                </label>
                {!h.closed && (
                  <>
                    <input type="time" value={h.open} onChange={(e) => updateHour(key, "open", e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-violet-400" />
                    <span className="text-gray-400 text-xs">to</span>
                    <input type="time" value={h.close} onChange={(e) => updateHour(key, "close", e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-violet-400" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Services / Menu */}
      <Section title={isFood ? "Menu" : "Services"} desc={isFood ? "Add items from your menu" : "List the services you offer"}>
        {[...(!isFood ? [{ type: "services" as const, items: services }] : []), ...(isFood ? [{ type: "menu" as const, items: menu }] : [])].map(({ type, items }) => (
          <div key={type}>
            <div className="flex justify-end mb-2">
              <button type="button" onClick={() => addItem(type)} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div><label className="text-xs text-gray-500 mb-1 block">Name</label><Input value={item.name} onChange={(v) => updateItem(type, item.id, "name", v)} placeholder="Item name" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Category</label><Input value={item.category} onChange={(v) => updateItem(type, item.id, "category", v)} placeholder="Category" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Price (€)</label><Input value={item.price} onChange={(v) => updateItem(type, item.id, "price", v)} placeholder="2.50" /></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">Description</label><Input value={item.description} onChange={(v) => updateItem(type, item.id, "description", v)} placeholder="Short description" /></div>
                    <button type="button" onClick={() => removeItem(type, item.id)} className="mt-5 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <button type="button" onClick={() => addItem(type)} className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-violet-200 hover:text-violet-400 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add first item
                </button>
              )}
            </div>
          </div>
        ))}
      </Section>

      {/* Capabilities */}
      <Section title="Capabilities" desc="What can the AI agent do on behalf of your business?">
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle label="Table Reservations"  desc="Accept reservations" checked={resEnabled}  onChange={setResEnabled} />
          <Toggle label="Appointments"         desc="Schedule appointments" checked={meetEnabled} onChange={setMeetEnabled} />
          <Toggle label="Delivery Orders"      desc="Take delivery orders" checked={delEnabled}  onChange={setDelEnabled} />
          <Toggle label="Takeaway Orders"      desc="Take takeaway orders" checked={takeEnabled} onChange={setTakeEnabled} />
        </div>
      </Section>

      {/* FAQ */}
      <Section title="FAQ" desc="The agent uses these to answer common customer questions">
        <div className="flex justify-end">
          <button type="button" onClick={addFAQ} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {faq.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div><label className="text-xs text-gray-500 mb-1 block">Question</label><Input value={item.question} onChange={(v) => updateFAQ(item.id, "question", v)} placeholder="Do you have WiFi?" /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Answer</label><Textarea value={item.answer} onChange={(v) => updateFAQ(item.id, "answer", v)} placeholder="Yes, free WiFi available." rows={2} /></div>
                </div>
                <button type="button" onClick={() => removeFAQ(item.id)} className="mt-5 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {faq.length === 0 && (
            <button type="button" onClick={addFAQ} className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-violet-200 hover:text-violet-400 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add first FAQ
            </button>
          )}
        </div>
      </Section>

      {/* Custom instructions */}
      <Section title="Custom Agent Instructions" desc="Additional instructions for the AI agent">
        <Textarea
          value={instructions}
          onChange={setInstructions}
          placeholder="e.g. Always mention our daily specials. Never quote delivery time without first checking availability..."
          rows={5}
        />
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
