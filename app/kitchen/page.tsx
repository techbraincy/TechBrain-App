"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Coffee, CheckCircle2, Clock, Phone, MapPin,
  RefreshCw, ArrowLeft, Zap,
} from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  items_summary: string;
  customer_phone: string;
  delivery_address: string;
  status: "pending" | "done";
  created_at: string;
}

async function getCsrfToken(): Promise<string> {
  const cookie = document.cookie.split("; ").find((r) => r.startsWith("csrf="))?.split("=")[1];
  if (cookie) return cookie;
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

function elapsed(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function isUrgent(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() > 15 * 60 * 1000;
}

export default function KitchenPage() {
  const [pending, setPending] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data: Order[] = await res.json();
        setPending(data.filter((o) => o.status === "pending"));
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, [load]);

  // Re-render every 30s to update elapsed times
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const markDone = async (id: string) => {
    setProcessingId(id);
    try {
      const csrf = await getCsrfToken();
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ status: "done" }),
      });
      setPending((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-none">Kitchen Display</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live pulse */}
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Live</span>
          </div>

          {/* Pending count */}
          {pending.length > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 rounded-lg px-2.5 py-1.5">
              <Coffee className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-sm font-bold text-orange-300">{pending.length}</span>
            </div>
          )}

          <button
            onClick={load}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Orders grid */}
      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-2xl shimmer" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/25 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-9 h-9 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-slate-200">All clear!</p>
            <p className="text-slate-500 mt-2">No pending orders right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map((order) => {
              const urgent = isUrgent(order.created_at);
              const isProcessing = processingId === order.id;

              return (
                <div
                  key={order.id + tick}
                  className={`flex flex-col bg-slate-900 border rounded-2xl overflow-hidden ${
                    urgent
                      ? "border-red-500/50 shadow-[0_0_24px_rgba(239,68,68,0.08)]"
                      : "border-orange-500/40 shadow-[0_0_24px_rgba(249,115,22,0.06)]"
                  }`}
                >
                  {/* Card header */}
                  <div className={`flex items-center justify-between px-5 py-3 border-b ${
                    urgent ? "border-red-500/20 bg-red-500/5" : "border-orange-500/15 bg-orange-500/5"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${urgent ? "bg-red-400" : "bg-orange-400"}`} />
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${urgent ? "bg-red-500" : "bg-orange-500"}`} />
                      </span>
                      <span className={`text-xs font-bold tracking-wide ${urgent ? "text-red-400" : "text-orange-400"}`}>
                        {urgent ? "URGENT" : "PENDING"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <span className={`text-sm font-bold font-mono ${urgent ? "text-red-400" : "text-slate-400"}`}>
                        {elapsed(order.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex-1 px-5 py-4 space-y-3">
                    <p className="text-lg font-bold text-slate-100 leading-snug">
                      {order.items_summary}
                    </p>
                    <div className="space-y-1.5">
                      {order.customer_name && (
                        <p className="text-base font-semibold text-slate-300">{order.customer_name}</p>
                      )}
                      {order.delivery_address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-400">{order.delivery_address}</p>
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-600 flex-shrink-0" />
                          <p className="text-sm text-slate-400">{order.customer_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Done button */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => markDone(order.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 active:scale-[0.98] border border-green-500/40 hover:border-green-500/60 text-green-300 font-bold py-3.5 rounded-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {isProcessing ? "Marking done…" : "Mark Complete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
