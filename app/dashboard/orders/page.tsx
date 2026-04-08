"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Coffee, Clock, Phone, MapPin, CheckCircle2, Trash2,
  RefreshCw, AlertCircle, Search, Printer, SlidersHorizontal,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface Order {
  id: string;
  customer_name: string;
  items_summary: string;
  customer_phone: string;
  delivery_address: string;
  caller_id: string;
  status: "pending" | "completed";
  created_at: string;
}

async function getCsrfToken(): Promise<string> {
  const cookie = document.cookie.split("; ").find((r) => r.startsWith("csrf="))?.split("=")[1];
  if (cookie) return cookie;
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function OrderSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded-lg shimmer" />
        <div className="h-8 w-24 rounded-lg shimmer" />
      </div>
      <div className="h-3 w-32 rounded shimmer" />
      <div className="h-3 w-56 rounded shimmer" />
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onMarkDone: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  processingId: string | null;
}

function OrderCard({ order, onMarkDone, onRemove, processingId }: OrderCardProps) {
  const isProcessing = processingId === order.id;
  const isDone = order.status === "completed";

  const ActionButton = () =>
    !isDone ? (
      <button
        onClick={() => onMarkDone(order.id)}
        disabled={isProcessing}
        className="flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 hover:border-green-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {isProcessing ? "Saving…" : "Mark Done"}
      </button>
    ) : (
      <button
        onClick={() => onRemove(order.id)}
        disabled={isProcessing}
        className="no-print flex items-center justify-center gap-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-2 rounded-xl transition-all disabled:opacity-50 w-full sm:w-auto"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isProcessing ? "…" : "Remove"}
      </button>
    );

  return (
    <div
      className={`group relative bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
        isDone
          ? "border-gray-100 opacity-50"
          : "border-orange-200 hover:border-orange-300 hover:shadow-sm"
      }`}
      style={!isDone ? { boxShadow: "0 1px 4px rgba(0,0,0,0.04)" } : undefined}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
          isDone ? "bg-gray-300" : "bg-orange-400 shadow-[0_0_6px_1px_rgba(251,146,60,0.4)]"
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-snug ${isDone ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {order.items_summary}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
          </div>
        </div>
        {/* Action on sm+ */}
        <div className="hidden sm:block flex-shrink-0">
          <ActionButton />
        </div>
      </div>

      {/* Details */}
      {!isDone && (
        <div className="mt-3 pl-5 space-y-1.5">
          {order.customer_name && (
            <p className="text-sm text-gray-700 font-medium">{order.customer_name}</p>
          )}
          {order.delivery_address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">{order.delivery_address}</p>
            </div>
          )}
          {order.customer_phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">{order.customer_phone}</p>
            </div>
          )}
        </div>
      )}

      {/* Action on mobile (full width) */}
      <div className="sm:hidden mt-3 pl-5">
        <ActionButton />
      </div>
    </div>
  );
}

type StatusTab = "all" | "pending" | "completed";
type SortOrder = "newest" | "oldest";

export default function OrdersPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [statusTab, setStatusTab]     = useState<StatusTab>("all");
  const [sort, setSort]               = useState<SortOrder>("newest");

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        setOrders(await res.json());
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError("Failed to load orders.");
      }
    } catch {
      setError("Network error. Retrying…");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 10_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const markDone = async (id: string) => {
    setProcessingId(id);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        await fetchOrders(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(`Mark done failed (${res.status}): ${body.error ?? "unknown error"}`);
      }
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setProcessingId(null);
    }
  };

  const removeOrder = async (id: string) => {
    setProcessingId(id);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrf },
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } else {
        const body = await res.json().catch(() => ({}));
        setError(`Remove failed (${res.status}): ${body.error ?? "unknown error"}`);
      }
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Filter + sort
  const q = search.toLowerCase();
  const filtered = orders
    .filter((o) => {
      if (statusTab !== "all" && o.status !== statusTab) return false;
      if (!q) return true;
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.toLowerCase().includes(q) ||
        o.items_summary?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const doneCount    = orders.filter((o) => o.status === "completed").length;

  const displayedPending = filtered.filter((o) => o.status === "pending");
  const displayedDone    = filtered.filter((o) => o.status === "completed");

  const TABS: { key: StatusTab; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: orders.length },
    { key: "pending", label: "Pending", count: pendingCount  },
    { key: "completed", label: "Done", count: doneCount },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 border border-orange-200">
            <Coffee className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Live Orders</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          {/* Live pulse */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Live</span>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search + Filter bar */}
      {!loading && (
        <div className="space-y-3 no-print">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or item…"
              className="w-full bg-white border border-gray-200 focus:border-violet-400 text-gray-900 placeholder-gray-400 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {/* Tabs + Sort */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1">
              {TABS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setStatusTab(key)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    statusTab === key
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    statusTab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSort((s) => s === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {sort === "newest" ? "Newest first" : "Oldest first"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {(statusTab === "all" || statusTab === "pending") && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pending</h2>
                {displayedPending.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                    {displayedPending.length}
                  </span>
                )}
              </div>
              {displayedPending.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-2xl">
                  {search ? (
                    <EmptyState icon={Search} title="No results" description={`No pending orders match "${search}"`} color="orange" />
                  ) : (
                    <EmptyState icon={CheckCircle2} title="All caught up!" description="No pending orders right now. New orders will appear here automatically." color="orange" />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedPending.map((order) => (
                    <OrderCard key={order.id} order={order} onMarkDone={markDone} onRemove={removeOrder} processingId={processingId} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {(statusTab === "all" || statusTab === "completed") && displayedDone.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Completed</h2>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                  {displayedDone.length}
                </span>
              </div>
              <div className="space-y-2">
                {displayedDone.map((order) => (
                  <OrderCard key={order.id} order={order} onMarkDone={markDone} onRemove={removeOrder} processingId={processingId} />
                ))}
              </div>
            </div>
          )}

          {/* Done empty when filtered */}
          {statusTab === "completed" && displayedDone.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl">
              <EmptyState icon={CheckCircle2} title="No completed orders" description={search ? `No completed orders match "${search}"` : "Completed orders will appear here."} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
