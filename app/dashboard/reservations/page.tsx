"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, Clock, Users, Phone, MessageSquare,
  RefreshCw, AlertCircle, Search, Printer,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Reservation } from "@/types/db";

function timeLabel(dateStr: string): { label: string; isToday: boolean; isTomorrow: boolean } {
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  return {
    label: dateStr === today ? "Today" : dateStr === tomorrow ? "Tomorrow" : dateStr,
    isToday: dateStr === today,
    isTomorrow: dateStr === tomorrow,
  };
}

function fmtTime(t: string) { return t.slice(0, 5); }

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function ReservationSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 rounded-lg shimmer" />
        <div className="h-6 w-16 rounded-lg shimmer" />
      </div>
      <div className="h-3 w-24 rounded shimmer" />
      <div className="h-3 w-48 rounded shimmer" />
    </div>
  );
}

type StatusFilter = "all" | "confirmed" | "cancelled";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        setReservations(await res.json());
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError("Failed to load reservations.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const iv = setInterval(() => fetch_(true), 30_000);
    return () => clearInterval(iv);
  }, [fetch_]);

  const q = search.toLowerCase();
  const filtered = reservations.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (
      r.customer_name?.toLowerCase().includes(q) ||
      r.phone_number?.toLowerCase().includes(q)
    );
  });

  // Group filtered by date
  const grouped: Record<string, Reservation[]> = {};
  for (const r of filtered) {
    if (!grouped[r.reservation_date]) grouped[r.reservation_date] = [];
    grouped[r.reservation_date].push(r);
  }
  const sortedDates = Object.keys(grouped).sort();

  const todayCount = reservations
    .filter((r) => r.reservation_date === new Date().toISOString().split("T")[0] && r.status === "confirmed")
    .length;

  const confirmedCount  = reservations.filter((r) => r.status === "confirmed").length;
  const cancelledCount  = reservations.filter((r) => r.status === "cancelled").length;

  const STATUS_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: reservations.length },
    { key: "confirmed", label: "Confirmed", count: confirmedCount       },
    { key: "cancelled", label: "Cancelled", count: cancelledCount       },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Reservations</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {todayCount > 0 ? `${todayCount} confirmed today` : "Upcoming bookings"} · {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={() => fetch_()}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
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

      {/* Search + Filter */}
      {!loading && (
        <div className="space-y-3 no-print">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 text-slate-200 placeholder-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_TABS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === key
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  statusFilter === key ? "bg-slate-600 text-slate-200" : "bg-slate-800 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <ReservationSkeleton key={i} />)}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          {search || statusFilter !== "all" ? (
            <EmptyState icon={Search} title="No results" description="No reservations match your filter." color="emerald" />
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming reservations" description="Bookings made via phone will appear here automatically." color="emerald" />
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => {
            const { label, isToday, isTomorrow } = timeLabel(date);
            const dayReservations = grouped[date];

            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Today
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="inline-flex text-[11px] font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        Tomorrow
                      </span>
                    )}
                    {!isToday && !isTomorrow && (
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{fmtDate(date)}</span>
                  <span className="ml-auto text-xs text-slate-600">
                    {dayReservations.length} booking{dayReservations.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {dayReservations.map((r) => (
                    <div
                      key={r.reservation_id}
                      className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                        isToday ? "border-emerald-500/25 hover:border-emerald-500/40" : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Time badge */}
                        <div className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex-shrink-0 ${
                          isToday ? "bg-emerald-500/10 border-emerald-500/25" : "bg-slate-800 border-slate-700"
                        }`}>
                          <Clock className={`w-3 h-3 mb-0.5 ${isToday ? "text-emerald-400" : "text-slate-500"}`} />
                          <span className={`text-xs sm:text-sm font-bold leading-none ${isToday ? "text-emerald-300" : "text-slate-300"}`}>
                            {fmtTime(String(r.reservation_time))}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-100 text-sm sm:text-base">{r.customer_name}</p>
                            <span className={`flex-shrink-0 inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                              r.status === "confirmed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : "bg-slate-800 text-slate-500 border-slate-700"
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-xs text-slate-400">{r.party_size} guests</span>
                            </div>
                            {r.phone_number && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-600" />
                                <span className="text-xs text-slate-400">{r.phone_number}</span>
                              </div>
                            )}
                          </div>
                          {r.notes && (
                            <div className="flex items-start gap-1 mt-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-500">{r.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
