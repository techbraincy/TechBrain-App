"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bike, Package, CalendarDays, Phone, Users, Clock,
  CheckCircle2, XCircle, ChevronRight, RefreshCw, Bell,
  ArrowLeft, StickyNote, Timer, Star, Truck, Utensils,
  MoreHorizontal, Copy
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BusinessOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  email: string | null;
  order_type: "delivery" | "takeaway";
  items: { id?: string; name: string; price?: string; quantity: number; notes?: string }[];
  items_summary: string | null;
  delivery_address: string | null;
  special_instructions: string | null;
  total_amount: string | null;
  status: string;
  staff_notes: string | null;
  estimated_ready_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BusinessReservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  email: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes: string | null;
  staff_notes: string | null;
  status: string;
  preferred_language: string;
  created_at: string;
  confirmed_at: string | null;
}

type Tab = "orders" | "reservations";
type OrderFilter = "new" | "active" | "done" | "all";

// ── Status definitions ────────────────────────────────────────────────────────
const ORDER_STATUS_MAP: Record<string, { label: string; badge: string; dot: string }> = {
  pending:          { label: "New",          badge: "bg-orange-100 text-orange-800 border border-orange-200",   dot: "bg-orange-500" },
  accepted:         { label: "Accepted",     badge: "bg-blue-100   text-blue-800   border border-blue-200",     dot: "bg-blue-500"   },
  preparing:        { label: "Preparing",    badge: "bg-violet-100 text-violet-800 border border-violet-200",   dot: "bg-violet-500" },
  ready:            { label: "Ready",        badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",dot: "bg-emerald-500"},
  out_for_delivery: { label: "On the way",   badge: "bg-cyan-100   text-cyan-800   border border-cyan-200",     dot: "bg-cyan-500"   },
  completed:        { label: "Done",         badge: "bg-gray-100   text-gray-600   border border-gray-200",     dot: "bg-gray-400"   },
  cancelled:        { label: "Cancelled",    badge: "bg-red-100    text-red-700    border border-red-200",      dot: "bg-red-500"    },
  rejected:         { label: "Rejected",     badge: "bg-red-100    text-red-700    border border-red-200",      dot: "bg-red-500"    },
};

const RES_STATUS_MAP: Record<string, { label: string; badge: string }> = {
  pending:   { label: "Pending",   badge: "bg-orange-100 text-orange-800 border border-orange-200" },
  confirmed: { label: "Confirmed", badge: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  cancelled: { label: "Cancelled", badge: "bg-red-100 text-red-700 border border-red-200" },
  completed: { label: "Done",      badge: "bg-gray-100 text-gray-600 border border-gray-200" },
  no_show:   { label: "No show",   badge: "bg-gray-100 text-gray-500 border border-gray-200" },
};

// Next logical status for quick-action
const ORDER_NEXT: Record<string, { label: string; value: string; color: string }[]> = {
  pending:          [
    { label: "✓ Accept",  value: "accepted",  color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { label: "✗ Decline", value: "rejected",  color: "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200" },
  ],
  accepted:         [{ label: "Start preparing", value: "preparing",        color: "bg-violet-600 hover:bg-violet-700 text-white" }],
  preparing:        [{ label: "Mark ready",       value: "ready",            color: "bg-emerald-600 hover:bg-emerald-700 text-white" }],
  ready:            [
    { label: "Out for delivery", value: "out_for_delivery", color: "bg-cyan-600 hover:bg-cyan-700 text-white" },
    { label: "Mark complete",    value: "completed",         color: "bg-gray-700 hover:bg-gray-800 text-white" },
  ],
  out_for_delivery: [{ label: "Mark delivered", value: "completed", color: "bg-emerald-600 hover:bg-emerald-700 text-white" }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : new Date(dateStr).toLocaleDateString("el", { day: "numeric", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("el", { hour: "2-digit", minute: "2-digit" });
}

function etaMins(iso: string | null): number | null {
  if (!iso) return null;
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  return m > 0 ? m : 0;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status, isRes = false }: { status: string; isRes?: boolean }) {
  const map = isRes ? RES_STATUS_MAP : ORDER_STATUS_MAP;
  const cfg = map[status] ?? { label: status, badge: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

// ── Order row card (left panel list) ──────────────────────────────────────────
function OrderRow({ order, selected, onSelect }: {
  order: BusinessOrder; selected: boolean; onSelect: () => void;
}) {
  const cfg   = ORDER_STATUS_MAP[order.status];
  const isPending = order.status === "pending";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? "bg-violet-50 border-l-2 border-l-violet-500" : ""
      } ${isPending ? "bg-orange-50/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg?.dot ?? "bg-gray-300"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{order.customer_name}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(order.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {order.order_type === "delivery"
              ? <Bike className="w-3 h-3 text-orange-500 flex-shrink-0" />
              : <Package className="w-3 h-3 text-blue-500 flex-shrink-0" />}
            <p className="text-xs text-gray-500 truncate">
              {order.items_summary ?? order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={order.status} />
            {order.total_amount && (
              <span className="text-xs font-bold text-gray-700">€{order.total_amount}</span>
            )}
            {order.estimated_ready_at && order.status !== "completed" && (() => {
              const m = etaMins(order.estimated_ready_at);
              return m !== null ? <span className="text-xs text-violet-600 flex items-center gap-0.5"><Timer className="w-3 h-3" />{m}m</span> : null;
            })()}
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ── Reservation row ────────────────────────────────────────────────────────────
function ResRow({ res, selected, onSelect }: {
  res: BusinessReservation; selected: boolean; onSelect: () => void;
}) {
  const date = new Date(res.reservation_date + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = date.getTime() === today.getTime();
  const isPast  = date < today;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? "bg-violet-50 border-l-2 border-l-violet-500" : ""
      } ${res.status === "pending" ? "bg-orange-50/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
          res.status === "pending" ? "bg-orange-500" : res.status === "confirmed" ? "bg-emerald-500" : "bg-gray-300"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{res.customer_name}</p>
            <span className={`text-xs flex-shrink-0 font-semibold ${isToday ? "text-violet-600" : isPast ? "text-red-400" : "text-gray-400"}`}>
              {isToday ? "Today" : date.toLocaleDateString("en", { month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{res.reservation_time.slice(0,5)}</span>
            <Users className="w-3 h-3 text-gray-400 ml-1" />
            <span className="text-xs text-gray-500">{res.party_size}</span>
          </div>
          <div className="mt-1">
            <StatusBadge status={res.status} isRes />
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ── Order Detail Panel ─────────────────────────────────────────────────────────
function OrderDetail({ order, businessId, onUpdate, onClose, csrfToken }: {
  order: BusinessOrder;
  businessId: string;
  onUpdate: () => void;
  onClose: () => void;
  csrfToken: string | null;
}) {
  const [updating,  setUpdating]  = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState(order.staff_notes ?? "");
  const [etaInput,   setEtaInput]   = useState("20");
  const [saving,    setSaving]    = useState(false);

  const nextActions = ORDER_NEXT[order.status] ?? [];

  async function updateStatus(status: string, extraEtaMins?: number) {
    if (!csrfToken) return;
    setUpdating(status);
    const body: Record<string, unknown> = { status };
    if (extraEtaMins) {
      body.estimated_ready_at = new Date(Date.now() + extraEtaMins * 60_000).toISOString();
    }
    if (staffNote !== order.staff_notes) body.staff_notes = staffNote;
    await fetch(`/api/businesses/${businessId}/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    });
    setUpdating(null);
    onUpdate();
  }

  async function saveNote() {
    if (!csrfToken) return;
    setSaving(true);
    await fetch(`/api/businesses/${businessId}/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ staff_notes: staffNote }),
    });
    setSaving(false);
    onUpdate();
  }

  const trackingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/portal/${businessId}/track/${order.id}`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-900">{order.customer_name}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">#{order.id.slice(0, 8).toUpperCase()} · {fmtTime(order.created_at)}</p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(trackingUrl)}
          title="Copy tracking link"
          className="text-gray-400 hover:text-violet-600 transition-colors"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* Accept / Reject — prominent for pending */}
          {order.status === "pending" && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <Bell className="w-4 h-4" /> New order awaiting approval
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={updating !== null}
                  onClick={() => updateStatus("accepted", parseInt(etaInput) || 20)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {updating === "accepted" ? "Accepting…" : "Accept"}
                </button>
                <button
                  type="button"
                  disabled={updating !== null}
                  onClick={() => updateStatus("rejected")}
                  className="flex-1 py-3 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-700 text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {updating === "rejected" ? "Declining…" : "Decline"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <label className="text-xs text-orange-700 font-medium">Estimated ready in</label>
                <input
                  type="number"
                  value={etaInput}
                  onChange={(e) => setEtaInput(e.target.value)}
                  min={5} max={120}
                  className="w-16 text-xs border border-orange-200 rounded-lg px-2 py-1 text-center outline-none focus:border-orange-400 bg-white"
                />
                <span className="text-xs text-orange-700">minutes</span>
              </div>
            </div>
          )}

          {/* Other status actions */}
          {order.status !== "pending" && nextActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nextActions.map((action) => (
                <button
                  key={action.value}
                  type="button"
                  disabled={updating !== null}
                  onClick={() => updateStatus(action.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${action.color}`}
                >
                  {updating === action.value ? "Updating…" : action.label}
                </button>
              ))}
            </div>
          )}

          {/* Customer info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
            <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`}
                 className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800">
                <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
              </a>
            )}
            {order.email && <p className="text-xs text-gray-500">{order.email}</p>}
          </div>

          {/* Order type + address */}
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              order.order_type === "delivery"
                ? "bg-orange-50 text-orange-700 border border-orange-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {order.order_type === "delivery" ? <Bike className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
              {order.order_type === "delivery" ? "Delivery" : "Takeaway"}
            </div>
            {order.delivery_address && (
              <p className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">📍</span>
                {order.delivery_address}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
            <div className="space-y-2">
              {order.items?.length > 0
                ? order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-900">{item.quantity}× {item.name}</span>
                        {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                      </div>
                      {item.price && parseFloat(item.price) > 0 && (
                        <span className="text-sm text-gray-500 font-medium">
                          €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))
                : <p className="text-sm text-gray-600">{order.items_summary}</p>
              }
              {order.total_amount && (
                <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-sm font-bold text-gray-900">€{order.total_amount}</span>
                </div>
              )}
            </div>
          </div>

          {order.special_instructions && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Customer notes</p>
              <p className="text-sm text-amber-800">{order.special_instructions}</p>
            </div>
          )}

          {/* ETA */}
          {order.estimated_ready_at && order.status !== "completed" && order.status !== "rejected" && order.status !== "cancelled" && (
            <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5">
              <Timer className="w-4 h-4 flex-shrink-0" />
              <span>ETA: {fmtTime(order.estimated_ready_at)}
                {(() => { const m = etaMins(order.estimated_ready_at); return m !== null && m > 0 ? ` (~${m} min)` : " — should be ready soon"; })()}
              </span>
            </div>
          )}

          {/* Staff notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Internal notes
            </label>
            <textarea
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              rows={3}
              placeholder="Notes for kitchen or delivery staff…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
            />
            {staffNote !== order.staff_notes && (
              <button type="button" onClick={saveNote} disabled={saving}
                className="mt-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50">
                {saving ? "Saving…" : "Save note"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reservation Detail Panel ───────────────────────────────────────────────────
function ReservationDetail({ res, businessId, onUpdate, onClose, csrfToken }: {
  res: BusinessReservation;
  businessId: string;
  onUpdate: () => void;
  onClose: () => void;
  csrfToken: string | null;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState(res.staff_notes ?? "");
  const [saving, setSaving] = useState(false);

  const date = new Date(res.reservation_date + "T00:00:00");

  async function updateStatus(status: string) {
    if (!csrfToken) return;
    setUpdating(status);
    const body: Record<string, unknown> = { status };
    if (staffNote !== res.staff_notes) body.staff_notes = staffNote;
    await fetch(`/api/businesses/${businessId}/reservations/${res.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    });
    setUpdating(null);
    onUpdate();
  }

  async function saveNote() {
    if (!csrfToken) return;
    setSaving(true);
    await fetch(`/api/businesses/${businessId}/reservations/${res.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ staff_notes: staffNote }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">{res.customer_name}</h2>
            <StatusBadge status={res.status} isRes />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">#{res.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Confirm / Decline for pending */}
        {res.status === "pending" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <Bell className="w-4 h-4" /> New booking awaiting confirmation
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={updating !== null}
                onClick={() => updateStatus("confirmed")}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {updating === "confirmed" ? "Confirming…" : "Confirm booking"}
              </button>
              <button type="button" disabled={updating !== null}
                onClick={() => updateStatus("cancelled")}
                className="flex-1 py-3 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-700 text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" />
                {updating === "cancelled" ? "Declining…" : "Decline"}
              </button>
            </div>
          </div>
        )}

        {res.status === "confirmed" && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={updating !== null} onClick={() => updateStatus("completed")}
              className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {updating === "completed" ? "…" : "Mark completed"}
            </button>
            <button type="button" disabled={updating !== null} onClick={() => updateStatus("no_show")}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-50">
              {updating === "no_show" ? "…" : "No show"}
            </button>
            <button type="button" disabled={updating !== null} onClick={() => updateStatus("cancelled")}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-semibold transition-colors disabled:opacity-50">
              {updating === "cancelled" ? "…" : "Cancel"}
            </button>
          </div>
        )}

        {/* Details */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
          <p className="text-sm font-semibold text-gray-900">{res.customer_name}</p>
          {res.customer_phone && (
            <a href={`tel:${res.customer_phone}`} className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800">
              <Phone className="w-3.5 h-3.5" /> {res.customer_phone}
            </a>
          )}
          {res.email && <p className="text-xs text-gray-500">{res.email}</p>}
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            res.preferred_language === "el" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}>
            {res.preferred_language === "el" ? "🇬🇷 Greek" : "🇬🇧 English"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {date.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-sm text-gray-600">at {res.reservation_time.slice(0, 5)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{res.party_size} {res.party_size === 1 ? "person" : "people"}</p>
          </div>
        </div>

        {res.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">Customer notes</p>
            <p className="text-sm text-amber-800">{res.notes}</p>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5" /> Internal notes
          </label>
          <textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)}
            rows={3} placeholder="Notes for staff…"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none" />
          {staffNote !== res.staff_notes && (
            <button type="button" onClick={saveNote} disabled={saving}
              className="mt-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50">
              {saving ? "Saving…" : "Save note"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  businessId: string;
  initialOrders: BusinessOrder[];
  initialReservations: BusinessReservation[];
  hasOrders: boolean;
  hasReservations: boolean;
  isMeetings: boolean;
}

export default function BusinessDashboardClient({
  businessId, initialOrders, initialReservations, hasOrders, hasReservations, isMeetings,
}: Props) {
  const [tab,          setTab]         = useState<Tab>(hasOrders ? "orders" : "reservations");
  const [orders,       setOrders]      = useState<BusinessOrder[]>(initialOrders);
  const [reservations, setRes]         = useState<BusinessReservation[]>(initialReservations);
  const [selectedOrderId, setSelOrder] = useState<string | null>(null);
  const [selectedResId,   setSelRes]   = useState<string | null>(null);
  const [orderFilter,  setOrderFilter] = useState<OrderFilter>("new");
  const [live,         setLive]        = useState(false);
  const [csrfToken,    setCsrf]        = useState<string | null>(null);
  const notifRef = useRef(false);

  useEffect(() => {
    const cookie = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("csrf="));
    if (cookie) setCsrf(cookie.split("=")[1]);
    else fetch("/api/auth/csrf").then((r) => r.json()).then((d) => setCsrf(d.csrfToken));
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/orders`);
    if (res.ok) setOrders(await res.json());
  }, [businessId]);

  const fetchRes = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/reservations`);
    if (res.ok) setRes(await res.json());
  }, [businessId]);

  useEffect(() => {
    const es = new EventSource(`/api/businesses/${businessId}/stream`);
    es.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "connected") setLive(true);
      if (msg.type === "orders") {
        fetchOrders();
        // Browser notification for new orders
        if (notifRef.current && Notification.permission === "granted") {
          new Notification("New order received!", { body: "A new order is waiting for approval." });
        }
        notifRef.current = true;
      }
      if (msg.type === "reservations") fetchRes();
    });
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [businessId, fetchOrders, fetchRes]);

  // Notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const activeOrders  = orders.filter((o) => ["accepted","preparing","ready","out_for_delivery"].includes(o.status)).length;
  const todayDone     = orders.filter((o) => o.status === "completed" && new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const pendingRes    = reservations.filter((r) => r.status === "pending").length;

  const filteredOrders = (() => {
    switch (orderFilter) {
      case "new":    return orders.filter((o) => o.status === "pending");
      case "active": return orders.filter((o) => ["accepted","preparing","ready","out_for_delivery"].includes(o.status));
      case "done":   return orders.filter((o) => ["completed","cancelled","rejected"].includes(o.status));
      default:       return orders;
    }
  })();

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedRes   = reservations.find((r) => r.id === selectedResId) ?? null;
  const showDetail    = (tab === "orders" && !!selectedOrder) || (tab === "reservations" && !!selectedRes);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)", minHeight: "600px" }}>
      {/* Top stats bar */}
      <div className="flex items-center gap-4 px-0 pb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${live ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
          <span className="text-xs text-gray-500">{live ? "Live" : "Connecting…"}</span>
        </div>
        {hasOrders && (
          <>
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5">
              <Bell className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-bold text-orange-700">{pendingOrders} new</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
              <Utensils className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">{activeOrders} active</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5">
              <Star className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-bold text-gray-600">{todayDone} done today</span>
            </div>
          </>
        )}
        {hasReservations && pendingRes > 0 && (
          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-bold text-purple-700">{pendingRes} bookings pending</span>
          </div>
        )}
        <button type="button" onClick={() => { fetchOrders(); fetchRes(); }}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main panel */}
      <div className="flex flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden"
           style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

        {/* Left: list */}
        <div className={`flex flex-col border-r border-gray-100 ${showDetail ? "hidden lg:flex lg:w-80 xl:w-96" : "flex w-full"}`}>
          {/* Tab row */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {hasOrders && (
              <button type="button" onClick={() => { setTab("orders"); setSelOrder(null); }}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  tab === "orders" ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                <Package className="w-4 h-4" /> Orders
                {pendingOrders > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white inline-flex items-center justify-center">
                    {pendingOrders}
                  </span>
                )}
              </button>
            )}
            {hasReservations && (
              <button type="button" onClick={() => { setTab("reservations"); setSelRes(null); }}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  tab === "reservations" ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                <CalendarDays className="w-4 h-4" /> {isMeetings ? "Appts" : "Reservations"}
                {pendingRes > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white inline-flex items-center justify-center">
                    {pendingRes}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Order filters */}
          {tab === "orders" && (
            <div className="flex gap-0 border-b border-gray-100 flex-shrink-0">
              {(["new","active","done","all"] as OrderFilter[]).map((f) => (
                <button key={f} type="button" onClick={() => setOrderFilter(f)}
                  className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
                    orderFilter === f ? "text-violet-700 bg-violet-50" : "text-gray-400 hover:text-gray-600"
                  }`}>
                  {f}
                  {f === "new" && pendingOrders > 0 && ` (${pendingOrders})`}
                  {f === "active" && activeOrders > 0 && ` (${activeOrders})`}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {tab === "orders" && (
              filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-300">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">No {orderFilter === "new" ? "new " : orderFilter === "active" ? "active " : ""}orders</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderRow key={order.id} order={order}
                    selected={selectedOrderId === order.id}
                    onSelect={() => { setSelOrder(order.id); setSelRes(null); }} />
                ))
              )
            )}
            {tab === "reservations" && (
              reservations.length === 0 ? (
                <div className="text-center py-16 text-gray-300">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">No reservations yet</p>
                </div>
              ) : (
                reservations.map((res) => (
                  <ResRow key={res.id} res={res}
                    selected={selectedResId === res.id}
                    onSelect={() => { setSelRes(res.id); setSelOrder(null); }} />
                ))
              )
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className={`flex-1 min-w-0 ${showDetail ? "flex flex-col" : "hidden lg:flex items-center justify-center"}`}>
          {!showDetail && (
            <div className="text-center text-gray-300 p-8">
              <Package className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm">Select an order to view details</p>
            </div>
          )}
          {tab === "orders" && selectedOrder && (
            <OrderDetail
              key={selectedOrder.id}
              order={selectedOrder}
              businessId={businessId}
              onUpdate={() => fetchOrders()}
              onClose={() => setSelOrder(null)}
              csrfToken={csrfToken}
            />
          )}
          {tab === "reservations" && selectedRes && (
            <ReservationDetail
              key={selectedRes.id}
              res={selectedRes}
              businessId={businessId}
              onUpdate={() => fetchRes()}
              onClose={() => setSelRes(null)}
              csrfToken={csrfToken}
            />
          )}
        </div>
      </div>
    </div>
  );
}
