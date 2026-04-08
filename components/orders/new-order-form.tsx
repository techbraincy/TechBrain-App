"use client";

import { useState } from "react";
import { Plus, Minus, X, Coffee, ShoppingBag } from "lucide-react";

const MENU = [
  { category: "Greek Coffee", items: ["Greek Coffee (Ellinikos)", "Double Greek Coffee"] },
  { category: "Espresso", items: ["Espresso", "Double Espresso", "Freddo Espresso"] },
  { category: "Milk Coffee", items: ["Cappuccino", "Double Cappuccino", "Freddo Cappuccino", "Latte", "Flat White"] },
  { category: "Other Coffee", items: ["Americano", "Filter Coffee", "Instant Coffee", "Nescafé Frappé"] },
  { category: "Hot Drinks", items: ["Hot Chocolate", "Mountain Tea", "Chamomile", "Green Tea", "Black Tea"] },
  { category: "Cold & Other", items: ["Fresh Orange Juice", "Lemonade", "Iced Tea", "Sparkling Water", "Still Water"] },
];

const SUGAR_OPTIONS = [
  { value: "sketos", label: "Sketo", desc: "No sugar" },
  { value: "oligh",  label: "Oligh", desc: "A little sugar" },
  { value: "metrios", label: "Metrio", desc: "Medium sugar" },
  { value: "glykos", label: "Glyko", desc: "Sweet" },
] as const;

type SugarType = "sketos" | "oligh" | "metrios" | "glykos";

interface OrderItem {
  name: string;
  sugar: SugarType;
  quantity: number;
}

async function getCsrf(): Promise<string> {
  const cookie = document.cookie.split("; ").find((r) => r.startsWith("csrf="))?.split("=")[1];
  if (cookie) return cookie;
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function NewOrderForm({ onSuccess, onClose }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(MENU[0].category);

  function addItem(name: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) return prev.map((i) => i.name === name ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { name, sugar: "sketos", quantity: 1 }];
    });
  }

  function removeItem(name: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((i) => i.name !== name);
      return prev.map((i) => i.name === name ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  function setSugar(name: string, sugar: SugarType) {
    setItems((prev) => prev.map((i) => i.name === name ? { ...i, sugar } : i));
  }

  function getQty(name: string) {
    return items.find((i) => i.name === name)?.quantity ?? 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("Add at least one item."); return; }
    if (!customerName.trim()) { setError("Customer name is required."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ customer_name: customerName.trim(), customer_phone: customerPhone.trim(), delivery_address: deliveryAddress.trim(), items, special_instructions: specialInstructions.trim() }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Failed to create order."); }
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  }

  const activeItems = MENU.find((c) => c.category === activeCategory)?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl max-h-[95dvh] flex flex-col border border-gray-200"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
              <Coffee className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">New Order</h2>
              <p className="text-[11px] text-gray-400">Default sugar: sketo (no sugar)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} id="order-form">
            <div className="p-5 space-y-5">

              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">Customer Name *</label>
                  <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Nikos Papadopoulos"
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">Phone</label>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 6912345678"
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">Delivery Address</label>
                <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Leave empty for take-away"
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
              </div>

              {/* Menu */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-2">Menu</label>

                {/* Category tabs */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {MENU.map((c) => (
                    <button key={c.category} type="button" onClick={() => setActiveCategory(c.category)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        activeCategory === c.category
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {c.category}
                    </button>
                  ))}
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeItems.map((item) => {
                    const qty = getQty(item);
                    return (
                      <div key={item} className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all ${
                        qty > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"
                      }`}>
                        <span className={`text-sm font-medium flex-1 ${qty > 0 ? "text-orange-800" : "text-gray-700"}`}>{item}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {qty > 0 && (
                            <button type="button" onClick={() => removeItem(item)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-200 text-orange-700 hover:bg-orange-300 transition-all">
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                          {qty > 0 && <span className="text-sm font-bold text-orange-700 w-4 text-center">{qty}</span>}
                          <button type="button" onClick={() => addItem(item)}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-all">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sugar preferences for selected items */}
              {items.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-2">Sugar Preferences</label>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5">
                        <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">
                          {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                        </span>
                        <div className="flex gap-1 flex-shrink-0">
                          {SUGAR_OPTIONS.map((s) => (
                            <button key={s.value} type="button" onClick={() => setSugar(item.name, s.value)}
                              title={s.desc}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-all ${
                                item.sugar === s.value
                                  ? "bg-violet-600 text-white"
                                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                              }`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">Special Instructions</label>
                <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any allergies, extra notes…" rows={2}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between gap-3 flex-shrink-0 bg-white">
          <div className="text-sm text-gray-500">
            {items.length === 0 ? "No items yet" : (
              <span className="font-medium text-gray-900">
                {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all">
              Cancel
            </button>
            <button type="submit" form="order-form" disabled={submitting || items.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
              <ShoppingBag className="w-4 h-4" />
              {submitting ? "Placing…" : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
