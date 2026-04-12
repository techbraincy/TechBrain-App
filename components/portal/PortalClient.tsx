"use client";

import { useState, useMemo } from "react";
import {
  ShoppingCart, CalendarDays, Plus, Minus, Trash2,
  CheckCircle2, Phone, MapPin, Clock, ChevronDown, ChevronUp,
  Bike, Package, X
} from "lucide-react";
import type { Business, ServiceItem } from "@/types/agent";

// ── Helpers ────────────────────────────────────────────────────────────────────
function hex(color: string | undefined, fallback = "#7c3aed"): string {
  if (!color || color === "#ffffff" || color === "#fff") return fallback;
  return color;
}

function fmt(price: string) {
  if (!price) return "";
  const n = parseFloat(price);
  if (isNaN(n)) return price;
  return `€${n.toFixed(2)}`;
}

// ── Cart types ─────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  notes: string;
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
type Tab = "order" | "reservation";

// ── Component ──────────────────────────────────────────────────────────────────
export default function PortalClient({ business }: { business: Business }) {
  const primary  = hex(business.branding_settings?.primary_color);
  const hasOrder = business.delivery_enabled || business.takeaway_enabled;
  const hasRes   = business.reservation_enabled || business.meetings_enabled;

  const allItems: ServiceItem[] = [
    ...(business.menu_catalog ?? []),
    ...(business.services    ?? []),
  ];

  const categories = useMemo(() => {
    const seen = new Set<string>();
    allItems.forEach((i) => i.category && seen.add(i.category));
    return ["All", ...Array.from(seen)];
  }, [allItems]);

  const [activeTab,    setActiveTab]    = useState<Tab>(hasOrder ? "order" : "reservation");
  const [activeCategory, setActiveCat] = useState("All");
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [orderType,    setOrderType]    = useState<"delivery" | "takeaway">(
    business.delivery_enabled ? "delivery" : "takeaway"
  );

  // Order form
  const [oName,    setOName]    = useState("");
  const [oPhone,   setOPhone]   = useState("");
  const [oEmail,   setOEmail]   = useState("");
  const [oAddress, setOAddress] = useState("");
  const [oNote,    setONote]    = useState("");
  const [oSubmitting,  setOSubmitting]  = useState(false);
  const [oSuccess,     setOSuccess]     = useState(false);
  const [oError,       setOError]       = useState("");
  const [oOrderId,     setOOrderId]     = useState<string | null>(null);

  // Reservation form
  const [rName,    setRName]    = useState("");
  const [rPhone,   setRPhone]   = useState("");
  const [rEmail,   setREmail]   = useState("");
  const [rDate,    setRDate]    = useState("");
  const [rTime,    setRTime]    = useState("");
  const [rSize,    setRSize]    = useState("2");
  const [rNote,    setRNote]    = useState("");
  const [rSubmitting, setRSubmitting] = useState(false);
  const [rSuccess,    setRSuccess]    = useState(false);
  const [rError,      setRError]      = useState("");

  const userLang = typeof navigator !== "undefined"
    ? (navigator.language?.split("-")[0] ?? null)
    : null;

  const filteredItems = activeCategory === "All"
    ? allItems
    : allItems.filter((i) => i.category === activeCategory);

  const cartTotal = cart.reduce((sum, i) => {
    const p = parseFloat(i.price);
    return sum + (isNaN(p) ? 0 : p * i.quantity);
  }, 0);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function addToCart(item: ServiceItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, notes: "" }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) => prev
      .map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
      .filter((c) => c.quantity > 0)
    );
  }

  function getQty(id: string) {
    return cart.find((c) => c.id === id)?.quantity ?? 0;
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!oName.trim()) { setOError("Name is required"); return; }
    if (orderType === "delivery" && !oAddress.trim()) { setOError("Delivery address is required"); return; }
    if (cart.length === 0) { setOError("Add at least one item"); return; }
    setOSubmitting(true);
    setOError("");
    try {
      const res = await fetch(`/api/portal/${business.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: oName.trim(),
          customer_phone: oPhone.trim() || null,
          customer_email: oEmail.trim() || null,
          preferred_language: userLang,
          order_type: orderType,
          delivery_address: oAddress.trim() || null,
          special_instructions: oNote.trim() || null,
          items: cart,
          total_amount: cartTotal > 0 ? cartTotal.toFixed(2) : null,
          items_summary: cart.map((i) => `${i.quantity}x ${i.name}`).join(", "),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      const data = await res.json();
      setOOrderId(data.id ?? null);
      setOSuccess(true);
      setCart([]);
    } catch (err) {
      setOError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setOSubmitting(false);
    }
  }

  async function submitReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!rName.trim()) { setRError("Name is required"); return; }
    if (!rDate)        { setRError("Date is required"); return; }
    if (!rTime)        { setRError("Time is required"); return; }
    setRSubmitting(true);
    setRError("");
    try {
      const res = await fetch(`/api/portal/${business.id}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: rName.trim(),
          customer_phone: rPhone.trim() || null,
          customer_email: rEmail.trim() || null,
          preferred_language: userLang,
          reservation_date: rDate,
          reservation_time: rTime,
          party_size: parseInt(rSize) || 2,
          notes: rNote.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      setRSuccess(true);
    } catch (err) {
      setRError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 shadow-sm" style={{ backgroundColor: primary }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{business.business_name}</h1>
            {business.address && (
              <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{business.address}
              </p>
            )}
          </div>
          {hasOrder && cartCount > 0 && (
            <button
              type="button"
              onClick={() => setCartOpen((o) => !o)}
              className="relative flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount}
              {cartTotal > 0 && <span className="hidden sm:inline">· €{cartTotal.toFixed(2)}</span>}
            </button>
          )}
        </div>

        {/* Tabs */}
        {hasOrder && hasRes && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("order")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "order" ? "bg-white text-gray-900" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reservation")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "reservation" ? "bg-white text-gray-900" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Reserve
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── ORDER TAB ─────────────────────────────────────────────────── */}
        {activeTab === "order" && hasOrder && (
          <>
            {/* Order type toggle */}
            {business.delivery_enabled && business.takeaway_enabled && (
              <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-1.5">
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                    orderType === "delivery"
                      ? "text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={orderType === "delivery" ? { backgroundColor: primary } : {}}
                >
                  <Bike className="w-4 h-4" /> Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                    orderType === "takeaway"
                      ? "text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={orderType === "takeaway" ? { backgroundColor: primary } : {}}
                >
                  <Package className="w-4 h-4" /> Takeaway
                </button>
              </div>
            )}

            {/* Hours hint */}
            {business.opening_hours && Object.keys(business.opening_hours).length > 0 && (() => {
              const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()] as keyof typeof business.opening_hours;
              const h = business.opening_hours[day];
              if (!h) return null;
              return (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  {h.closed ? "Closed today" : `Open today ${h.open} – ${h.close}`}
                </div>
              );
            })()}

            {/* Category filter */}
            {categories.length > 2 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      activeCategory === cat
                        ? "text-white border-transparent"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                    style={activeCategory === cat ? { backgroundColor: primary, borderColor: primary } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Menu items */}
            {filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const qty = getQty(item.id);
                  return (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3"
                         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                        {item.price && <p className="text-sm font-bold mt-1" style={{ color: primary }}>{fmt(item.price)}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {qty > 0 ? (
                          <>
                            <button type="button" onClick={() => changeQty(item.id, -1)}
                              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-gray-900">{qty}</span>
                            <button type="button" onClick={() => changeQty(item.id, 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors"
                              style={{ backgroundColor: primary }}>
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors shadow-sm"
                            style={{ backgroundColor: primary }}>
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">No items available</div>
            )}

            {/* Cart drawer (bottom) */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 left-0 right-0 z-30 -mx-4 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-50 via-gray-50">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCartOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> {cartCount} item{cartCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      {cartTotal > 0 && <strong style={{ color: primary }}>€{cartTotal.toFixed(2)}</strong>}
                      {cartOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                    </span>
                  </button>

                  {cartOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      {/* Cart items */}
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => changeQty(item.id, -1)}
                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                                <Minus className="w-2.5 h-2.5 text-gray-500" />
                              </button>
                              <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                              <button type="button" onClick={() => changeQty(item.id, 1)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: primary }}>
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                            {item.price && parseFloat(item.price) > 0 && (
                              <span className="text-xs font-semibold text-gray-600">
                                €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                              </span>
                            )}
                            <button type="button" onClick={() => removeFromCart(item.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Order form */}
                      {oSuccess ? (
                        <div className="flex flex-col items-center gap-2 py-4 text-center">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                          <p className="font-semibold text-gray-900">Order placed!</p>
                          <p className="text-sm text-gray-500">We'll be in touch shortly.</p>
                          {oOrderId && (
                            <a
                              href={`/portal/${business.id}/track/${oOrderId}`}
                              className="mt-1 text-xs font-medium underline"
                              style={{ color: primary }}
                            >
                              Track your order →
                            </a>
                          )}
                          <button type="button" onClick={() => { setOSuccess(false); setOOrderId(null); setCartOpen(false); }}
                            className="mt-2 text-xs text-violet-600 hover:underline">Place another order</button>
                        </div>
                      ) : (
                        <form onSubmit={submitOrder} className="space-y-3 border-t border-gray-100 pt-4">
                          <div className="grid grid-cols-2 gap-2">
                            <input value={oName} onChange={(e) => setOName(e.target.value)} placeholder="Your name *"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                            <input value={oPhone} onChange={(e) => setOPhone(e.target.value)} placeholder="Phone"
                              type="tel"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                          </div>
                          <input value={oEmail} onChange={(e) => setOEmail(e.target.value)} placeholder="Email (for updates)"
                            type="email"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                          {orderType === "delivery" && (
                            <input value={oAddress} onChange={(e) => setOAddress(e.target.value)} placeholder="Delivery address *"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                          )}
                          <input value={oNote} onChange={(e) => setONote(e.target.value)} placeholder="Special instructions (optional)"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                          {oError && <p className="text-xs text-red-500">{oError}</p>}
                          <button type="submit" disabled={oSubmitting}
                            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
                            style={{ backgroundColor: primary }}>
                            {oSubmitting ? "Placing order…" : `Place ${orderType} order${cartTotal > 0 ? ` · €${cartTotal.toFixed(2)}` : ""}`}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RESERVATION TAB ───────────────────────────────────────────── */}
        {activeTab === "reservation" && hasRes && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5"
               style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div>
              <h2 className="font-semibold text-gray-900">
                {business.meetings_enabled ? "Book an Appointment" : "Table Reservation"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {business.meetings_enabled
                  ? "Fill in your details and we'll confirm your appointment."
                  : `Party sizes up to ${business.workflow_settings?.max_party_size ?? 10}. We'll confirm within minutes.`}
              </p>
            </div>

            {rSuccess ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <p className="font-bold text-gray-900 text-lg">Request received!</p>
                <p className="text-sm text-gray-500">We'll contact you to confirm your booking.</p>
                <button type="button" onClick={() => setRSuccess(false)}
                  className="mt-3 text-sm font-medium hover:underline" style={{ color: primary }}>
                  Make another booking
                </button>
              </div>
            ) : (
              <form onSubmit={submitReservation} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input value={rName} onChange={(e) => setRName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input value={rPhone} onChange={(e) => setRPhone(e.target.value)}
                      type="tel" placeholder="+30 ..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input value={rEmail} onChange={(e) => setREmail(e.target.value)}
                    type="email" placeholder="your@email.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                    <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} min={today}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                    <input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400" />
                  </div>
                </div>
                {!business.meetings_enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Party size</label>
                    <select value={rSize} onChange={(e) => setRSize(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400 bg-white">
                      {Array.from({ length: business.workflow_settings?.max_party_size ?? 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea value={rNote} onChange={(e) => setRNote(e.target.value)}
                    rows={2} placeholder="Special requests, allergies…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400 resize-none" />
                </div>
                {rError && <p className="text-xs text-red-500">{rError}</p>}
                <button type="submit" disabled={rSubmitting}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: primary }}>
                  {rSubmitting ? "Submitting…" : "Request booking"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Business info */}
        <div className="text-center text-xs text-gray-400 space-y-1 pt-2 pb-6">
          {business.phone_number && (
            <p className="flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" /> {business.phone_number}
            </p>
          )}
          {business.address && (
            <p className="flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" /> {business.address}
            </p>
          )}
          <p className="pt-1 opacity-50">Powered by TechBrain AI</p>
        </div>
      </div>
    </div>
  );
}
