"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Coffee, CalendarDays, Clock, Users, Phone, AlertCircle } from "lucide-react";

interface OrderResult {
  id: string;
  customer_name: string;
  customer_phone: string;
  items_summary: string;
  status: "pending" | "done";
  created_at: string;
}

interface ReservationResult {
  reservation_id: string;
  customer_name: string;
  phone_number: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: "confirmed" | "cancelled";
  notes: string;
}

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
}

export default function HistoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ orders: OrderResult[]; reservations: ReservationResult[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
      else setError("Search failed.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer.current);
  }, [query, search]);

  const total = (results?.orders.length ?? 0) + (results?.reservations.length ?? 0);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Customer History</h1>
          <p className="text-xs text-slate-500 mt-0.5">Search orders and reservations by name or phone</p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a customer name or phone number…"
          autoFocus
          className="w-full bg-slate-900 border border-slate-800 focus:border-violet-500/50 text-slate-100 placeholder-slate-600 rounded-xl pl-11 pr-10 py-3.5 text-sm outline-none transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Initial empty state */}
      {!results && !loading && query.length < 2 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-violet-400/50" />
          </div>
          <p className="text-slate-400 font-medium">Search across all records</p>
          <p className="text-sm text-slate-600 mt-1.5">Enter at least 2 characters to begin</p>
        </div>
      )}

      {/* No results */}
      {results && total === 0 && (
        <div className="py-16 text-center">
          <p className="text-slate-400 font-medium">No results for "{query}"</p>
          <p className="text-sm text-slate-600 mt-1">Try a different name or phone number</p>
        </div>
      )}

      {/* Results */}
      {results && total > 0 && (
        <div className="space-y-6">
          {/* Orders */}
          {results.orders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Coffee className="w-3.5 h-3.5 text-orange-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Orders</h2>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{results.orders.length}</span>
              </div>
              <div className="space-y-2">
                {results.orders.map((o) => (
                  <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{o.items_summary}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {o.customer_name && (
                            <span className="text-xs text-slate-400 font-medium">{o.customer_name}</span>
                          )}
                          {o.customer_phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="w-3 h-3" /> {o.customer_phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-slate-600">
                            <Clock className="w-3 h-3" /> {timeAgo(o.created_at)}
                          </span>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        o.status === "done"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      }`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservations */}
          {results.reservations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Reservations</h2>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{results.reservations.length}</span>
              </div>
              <div className="space-y-2">
                {results.reservations.map((r) => (
                  <div key={r.reservation_id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200">{r.customer_name}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-xs text-slate-500">
                            {new Date(r.reservation_date + "T12:00:00").toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })} at {fmtTime(r.reservation_time)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3 h-3" /> {r.party_size}
                          </span>
                          {r.phone_number && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="w-3 h-3" /> {r.phone_number}
                            </span>
                          )}
                        </div>
                        {r.notes && (
                          <p className="text-xs text-slate-600 mt-1 italic truncate">"{r.notes}"</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        r.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
