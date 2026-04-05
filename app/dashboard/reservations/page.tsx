"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, Clock, Users, Phone, MessageSquare, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
import type { Reservation } from "@/types/db";

function timeLabel(dateStr: string, timeStr: string): { label: string; isToday: boolean; isTomorrow: boolean } {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  const isToday = dateStr === today;
  const isTomorrow = dateStr === tomorrow;
  const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : dateStr;
  return { label, isToday, isTomorrow };
}

function fmtTime(t: string): string {
  return t.slice(0, 5);
}

function fmtDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function ReservationSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 rounded-lg shimmer" />
        <div className="h-6 w-16 rounded-lg shimmer" />
      </div>
      <div className="h-3 w-24 rounded shimmer" />
      <div className="h-3 w-48 rounded shimmer" />
    </div>
  );
}

interface GroupedReservations {
  [date: string]: Reservation[];
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  // Group by date
  const grouped: GroupedReservations = {};
  for (const r of reservations) {
    if (!grouped[r.reservation_date]) grouped[r.reservation_date] = [];
    grouped[r.reservation_date].push(r);
  }
  const sortedDates = Object.keys(grouped).sort();

  const todayCount = grouped[new Date().toISOString().split("T")[0]]?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Reservations</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {todayCount > 0 ? `${todayCount} confirmed today` : "Upcoming bookings"} · updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetch_()}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
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
          {[1, 2, 3, 4].map((i) => <ReservationSkeleton key={i} />)}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center">
          <CalendarDays className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No upcoming reservations</p>
          <p className="text-sm text-slate-600 mt-1">Bookings will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => {
            const { label, isToday, isTomorrow } = timeLabel(date, "");
            const dayReservations = grouped[date];

            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Today
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="inline-flex text-[11px] font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        Tomorrow
                      </span>
                    )}
                    {!isToday && !isTomorrow && (
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        {label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{fmtDate(date)}</span>
                  <span className="ml-auto text-xs text-slate-600">
                    {dayReservations.length} booking{dayReservations.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Reservation cards */}
                <div className="space-y-3">
                  {dayReservations.map((r) => (
                    <div
                      key={r.reservation_id}
                      className={`bg-slate-900 border rounded-2xl p-5 transition-all duration-200 ${
                        isToday ? "border-emerald-500/25 hover:border-emerald-500/40" : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: time + name */}
                        <div className="flex items-start gap-4">
                          {/* Time badge */}
                          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border flex-shrink-0 ${
                            isToday
                              ? "bg-emerald-500/10 border-emerald-500/25"
                              : "bg-slate-800 border-slate-700"
                          }`}>
                            <Clock className={`w-3 h-3 mb-0.5 ${isToday ? "text-emerald-400" : "text-slate-500"}`} />
                            <span className={`text-sm font-bold leading-none ${isToday ? "text-emerald-300" : "text-slate-300"}`}>
                              {fmtTime(String(r.reservation_time))}
                            </span>
                          </div>

                          {/* Info */}
                          <div>
                            <p className="font-semibold text-slate-100">{r.customer_name}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
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

                        {/* Right: reservation ID + status */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                            r.status === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : "bg-slate-800 text-slate-500 border-slate-700"
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">{r.reservation_id}</span>
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
