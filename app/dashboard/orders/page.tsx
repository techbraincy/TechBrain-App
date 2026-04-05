"use client";

import { useEffect, useState, useCallback } from "react";
import { Coffee, Clock, Phone, MapPin, CheckCircle2, Trash2, RefreshCw, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  items_summary: string;
  customer_phone: string;
  delivery_address: string;
  caller_id: string;
  status: "pending" | "done";
  created_at: string;
}

function getCsrfToken(): string {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf="))
      ?.split("=")[1] ?? ""
  );
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function OrderSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 animate-pulse">
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
  const isDone = order.status === "done";

  return (
    <div
      className={`group relative bg-slate-900 border rounded-2xl p-5 transition-all duration-200 ${
        isDone
          ? "border-slate-800 opacity-50"
          : "border-orange-500/30 hover:border-orange-500/50"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Status dot */}
          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
            isDone ? "bg-slate-600" : "bg-orange-400 shadow-[0_0_6px_1px_rgba(251,146,60,0.4)]"
          }`} />

          {/* Items */}
          <div className="min-w-0">
            <p className={`font-semibold text-sm leading-snug ${isDone ? "text-slate-500 line-through" : "text-slate-100"}`}>
              {order.items_summary}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 text-slate-600" />
              <span className="text-xs text-slate-600">{timeAgo(order.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        {!isDone ? (
          <button
            onClick={() => onMarkDone(order.id)}
            disabled={isProcessing}
            className="flex-shrink-0 flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 hover:border-green-500/50 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isProcessing ? "Saving…" : "Mark Done"}
          </button>
        ) : (
          <button
            onClick={() => onRemove(order.id)}
            disabled={isProcessing}
            className="flex-shrink-0 flex items-center gap-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium px-3 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isProcessing ? "…" : "Remove"}
          </button>
        )}
      </div>

      {/* Details */}
      {!isDone && (
        <div className="mt-3 pl-5 space-y-1.5">
          {order.customer_name && (
            <p className="text-sm text-slate-300 font-medium">{order.customer_name}</p>
          )}
          {order.delivery_address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">{order.delivery_address}</p>
            </div>
          )}
          {order.customer_phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <p className="text-xs text-slate-500">{order.customer_phone}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ status: "done" }),
      });
      await fetchOrders(true);
    } finally {
      setProcessingId(null);
    }
  };

  const removeOrder = async (id: string) => {
    setProcessingId(id);
    try {
      await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setProcessingId(null);
    }
  };

  const pending = orders.filter((o) => o.status === "pending");
  const done = orders.filter((o) => o.status === "done");

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Coffee className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Live Orders</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live pulse */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-slate-400 font-medium">Live</span>
          </div>

          <button
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pending</h2>
              {pending.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-700 mt-1">No pending orders right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkDone={markDone}
                    onRemove={removeOrder}
                    processingId={processingId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Done */}
          {done.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Completed</h2>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">
                  {done.length}
                </span>
              </div>
              <div className="space-y-2">
                {done.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkDone={markDone}
                    onRemove={removeOrder}
                    processingId={processingId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
