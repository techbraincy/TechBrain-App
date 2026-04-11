"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, CheckCircle2, Clock, ChevronDown,
  Bike, Package, CalendarDays, Phone, Users, FileText,
  XCircle, AlertCircle
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BusinessOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  order_type: "delivery" | "takeaway";
  items: { id: string; name: string; price?: string; quantity: number; notes?: string }[];
  items_summary: string | null;
  delivery_address: string | null;
  special_instructions: string | null;
  total_amount: string | null;
  status: string;
  created_at: string;
}

interface BusinessReservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes: string | null;
  status: string;
  created_at: string;
}

type Tab = "orders" | "reservations";

// ── Status config ─────────────────────────────────────────────────────────────
const ORDER_STATUSES = [
  { value: "pending",    label: "Pending",    color: "text-amber-700  bg-amber-50  border-amber-200"  },
  { value: "confirmed",  label: "Confirmed",  color: "text-blue-700   bg-blue-50   border-blue-200"   },
  { value: "preparing",  label: "Preparing",  color: "text-violet-700 bg-violet-50 border-violet-200" },
  { value: "ready",      label: "Ready",      color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "completed",  label: "Completed",  color: "text-gray-600   bg-gray-100  border-gray-200"   },
  { value: "cancelled",  label: "Cancelled",  color: "text-red-700    bg-red-50    border-red-200"    },
];

const RES_STATUSES = [
  { value: "pending",   label: "Pending",   color: "text-amber-700  bg-amber-50  border-amber-200"  },
  { value: "confirmed", label: "Confirmed", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "cancelled", label: "Cancelled", color: "text-red-700    bg-red-50    border-red-200"    },
  { value: "completed", label: "Completed", color: "text-gray-600   bg-gray-100  border-gray-200"   },
];

function statusColor(status: string, isRes = false) {
  const list = isRes ? RES_STATUSES : ORDER_STATUSES;
  return list.find((s) => s.value === status)?.color ?? "text-gray-600 bg-gray-100 border-gray-200";
}

function StatusBadge({ status, isRes = false }: { status: string; isRes?: boolean }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor(status, isRes)}`}>
      {status}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order, onStatusChange, updating,
}: {
  order: BusinessOrder;
  onStatusChange: (id: string, status: string) => void;
  updating: string | null;
}) {
  const [expanded, setExpanded] = useState(order.status === "pending");
  const [selectOpen, setSelectOpen] = useState(false);
  const active = ORDER_STATUSES.filter((s) => s.value !== order.status);

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      order.status === "pending" ? "border-amber-200 shadow-amber-50 shadow-md" : "border-gray-200"
    }`} style={{ boxShadow: order.status === "pending" ? "0 2px 12px rgba(245,158,11,0.12)" : "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                order.order_type === "delivery"
                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                {order.order_type === "delivery" ? <Bike className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                {order.order_type}
              </span>
              <StatusBadge status={order.status} />
              <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
            </div>
            <p className="font-semibold text-gray-900 mt-1.5">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {order.customer_phone}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1.5 line-clamp-1">
              {order.items_summary ?? order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
            </p>
            {order.total_amount && (
              <p className="text-sm font-bold text-gray-900 mt-0.5">€{order.total_amount}</p>
            )}
          </div>
          <button type="button" onClick={() => setExpanded((e) => !e)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {/* Items */}
            {order.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Items</p>
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.quantity}× {item.name}</span>
                      {item.price && parseFloat(item.price) > 0 && (
                        <span className="text-gray-500 text-xs">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {order.delivery_address && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Delivery address</p>
                <p className="text-sm text-gray-700">{order.delivery_address}</p>
              </div>
            )}
            {order.special_instructions && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-sm text-gray-700">{order.special_instructions}</p>
              </div>
            )}
            {/* Status actions */}
            {order.status !== "completed" && order.status !== "cancelled" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {active.slice(0, 3).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={updating === order.id}
                    onClick={() => onStatusChange(order.id, s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${s.color}`}
                  >
                    {updating === order.id ? "…" : `Mark ${s.label}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reservation Card ──────────────────────────────────────────────────────────
function ReservationCard({
  res, onStatusChange, updating, isMeetings,
}: {
  res: BusinessReservation;
  onStatusChange: (id: string, status: string) => void;
  updating: string | null;
  isMeetings: boolean;
}) {
  const [expanded, setExpanded] = useState(res.status === "pending");
  const active = RES_STATUSES.filter((s) => s.value !== res.status);
  const isPast = res.reservation_date < new Date().toISOString().split("T")[0];

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden ${
      res.status === "pending" && !isPast
        ? "border-amber-200"
        : "border-gray-200"
    }`} style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={res.status} isRes />
              <span className="text-xs text-gray-400">{timeAgo(res.created_at)}</span>
              {isPast && res.status === "pending" && (
                <span className="text-xs text-red-500">Past</span>
              )}
            </div>
            <p className="font-semibold text-gray-900 mt-1.5">{res.customer_name}</p>
            {res.customer_phone && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {res.customer_phone}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-sm text-gray-700">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                {new Date(res.reservation_date + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                {" "}{res.reservation_time.slice(0, 5)}
              </span>
              {!isMeetings && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" /> {res.party_size} {res.party_size === 1 ? "person" : "people"}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setExpanded((e) => !e)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {res.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-sm text-gray-700">{res.notes}</p>
              </div>
            )}
            {res.status !== "completed" && res.status !== "cancelled" && (
              <div className="flex flex-wrap gap-2">
                {active.slice(0, 3).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={updating === res.id}
                    onClick={() => onStatusChange(res.id, s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${s.color}`}
                  >
                    {updating === res.id ? "…" : `Mark ${s.label}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [activeTab,     setActiveTab]     = useState<Tab>(hasOrders ? "orders" : "reservations");
  const [orders,        setOrders]        = useState<BusinessOrder[]>(initialOrders);
  const [reservations,  setReservations]  = useState<BusinessReservation[]>(initialReservations);
  const [updatingId,    setUpdatingId]    = useState<string | null>(null);
  const [live,          setLive]          = useState(false);
  const [csrfToken,     setCsrfToken]     = useState<string | null>(null);
  const [filterStatus,  setFilterStatus]  = useState("all");

  useEffect(() => {
    const cookie = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("csrf="));
    if (cookie) setCsrfToken(cookie.split("=")[1]);
    else fetch("/api/auth/csrf").then((r) => r.json()).then((d) => setCsrfToken(d.csrfToken));
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/orders`);
    if (res.ok) setOrders(await res.json());
  }, [businessId]);

  const fetchReservations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/reservations`);
    if (res.ok) setReservations(await res.json());
  }, [businessId]);

  // SSE
  useEffect(() => {
    const es = new EventSource(`/api/businesses/${businessId}/stream`);
    es.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "connected") setLive(true);
      if (msg.type === "orders")       fetchOrders();
      if (msg.type === "reservations") fetchReservations();
    });
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [businessId, fetchOrders, fetchReservations]);

  async function updateOrderStatus(id: string, status: string) {
    if (!csrfToken) return;
    setUpdatingId(id);
    await fetch(`/api/businesses/${businessId}/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    fetchOrders();
  }

  async function updateResStatus(id: string, status: string) {
    if (!csrfToken) return;
    setUpdatingId(id);
    await fetch(`/api/businesses/${businessId}/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    fetchReservations();
  }

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const pendingRes    = reservations.filter((r) => r.status === "pending").length;

  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  const filteredRes = filterStatus === "all"
    ? reservations
    : reservations.filter((r) => r.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${live ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
        <span className="text-xs text-gray-500">{live ? "Live updates active" : "Connecting…"}</span>
        <button type="button" onClick={() => { fetchOrders(); fetchReservations(); }}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      {hasOrders && hasReservations && (
        <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
          <button type="button" onClick={() => { setActiveTab("orders"); setFilterStatus("all"); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "orders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Package className="w-4 h-4" /> Orders
            {pendingOrders > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {pendingOrders}
              </span>
            )}
          </button>
          <button type="button" onClick={() => { setActiveTab("reservations"); setFilterStatus("all"); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "reservations" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <CalendarDays className="w-4 h-4" /> {isMeetings ? "Appointments" : "Reservations"}
            {pendingRes > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {pendingRes}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Status filter */}
      {activeTab === "orders" && hasOrders && (
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <button key={s} type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                filterStatus === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}>{s}</button>
          ))}
        </div>
      )}

      {activeTab === "reservations" && hasReservations && (
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => (
            <button key={s} type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                filterStatus === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}>{s}</button>
          ))}
        </div>
      )}

      {/* Orders list */}
      {activeTab === "orders" && hasOrders && (
        filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order}
                onStatusChange={updateOrderStatus} updating={updatingId} />
            ))}
          </div>
        )
      )}

      {/* Reservations list */}
      {activeTab === "reservations" && hasReservations && (
        filteredRes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No {isMeetings ? "appointments" : "reservations"} yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRes.map((res) => (
              <ReservationCard key={res.id} res={res}
                onStatusChange={updateResStatus} updating={updatingId} isMeetings={isMeetings} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
