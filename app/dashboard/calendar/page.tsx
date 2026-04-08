"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Users, Clock, Phone, RefreshCw, MapPin,
} from "lucide-react";
import type { Reservation } from "@/types/db";

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function fmtShort(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Calendar grid ─────────────────────────────────────────────────────────────
function CalendarGrid({
  year, month, reservationsByDate, selectedDate, onSelectDate,
}: {
  year: number;
  month: number;
  reservationsByDate: Record<string, Reservation[]>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  const today = todayStr();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Mon-first

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-600 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = isoDate(year, month, day);
          const rsvs = reservationsByDate[dateStr] ?? [];
          const confirmed = rsvs.filter((r) => r.status === "confirmed");
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isPast = dateStr < today;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex flex-col items-center justify-start pt-1.5 pb-2 rounded-xl text-sm
                transition-all duration-150 min-h-[54px] border
                ${isSelected
                  ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                  : isToday
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
                  : isPast
                  ? "border-transparent text-slate-700 hover:bg-slate-800/30 hover:text-slate-500"
                  : "border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                }
              `}
            >
              <span className={`text-xs leading-none ${isToday ? "font-bold" : "font-medium"}`}>{day}</span>
              {confirmed.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center px-1">
                  {confirmed.slice(0, 3).map((_, ri) => (
                    <span
                      key={ri}
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-indigo-400" : "bg-emerald-500"}`}
                    />
                  ))}
                  {confirmed.length > 3 && (
                    <span className="text-[8px] text-slate-500 leading-none mt-0.5">+{confirmed.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Reservation card ──────────────────────────────────────────────────────────
function ReservationCard({ r }: { r: Reservation }) {
  const isConfirmed = r.status === "confirmed";
  return (
    <div
      className={`bg-slate-950 border rounded-xl p-4 transition-all ${
        isConfirmed ? "border-slate-800" : "border-slate-800/50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-100 truncate">{r.customer_name}</p>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                isConfirmed
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              {r.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" /> {fmtTime(r.reservation_time)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3 h-3" /> {r.party_size} guests
            </span>
            {r.table_id && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3" /> Table {r.table_id}
              </span>
            )}
            {r.phone_number && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Phone className="w-3 h-3" /> {r.phone_number}
              </span>
            )}
          </div>
          {r.notes && (
            <p className="text-xs text-slate-600 mt-1.5 italic truncate">"{r.notes}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl shimmer" />)}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-80 rounded-2xl shimmer" />
        <div className="lg:col-span-2 space-y-3">
          <div className="h-20 rounded-xl shimmer" />
          <div className="h-20 rounded-xl shimmer" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewDate, setViewDate]   = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr());

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) setReservations(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      if (!map[r.reservation_date]) map[r.reservation_date] = [];
      map[r.reservation_date].push(r);
    }
    return map;
  }, [reservations]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedRsvs   = selectedDate ? (reservationsByDate[selectedDate] ?? []) : [];
  const monthName      = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const totalConfirmed = reservations.filter((r) => r.status === "confirmed").length;
  const totalGuests    = reservations
    .filter((r) => r.status === "confirmed")
    .reduce((s, r) => s + r.party_size, 0);
  const todayCount     = (reservationsByDate[todayStr()] ?? [])
    .filter((r) => r.status === "confirmed").length;

  const upcomingDates = useMemo(() => {
    const today = todayStr();
    return Object.keys(reservationsByDate)
      .filter((d) => d >= today)
      .sort()
      .slice(0, 6);
  }, [reservationsByDate]);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Calendar</h1>
            <p className="text-xs text-slate-500 mt-0.5">Upcoming reservations</p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? <Skeleton /> : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Upcoming</p>
              <p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{totalConfirmed}</p>
              <p className="text-xs text-slate-600 mt-0.5">confirmed bookings</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Guests</p>
              <p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{totalGuests}</p>
              <p className="text-xs text-slate-600 mt-0.5">across all bookings</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Today</p>
              <p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{todayCount}</p>
              <p className="text-xs text-slate-600 mt-0.5">reservations today</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Calendar panel */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-semibold text-slate-200">{monthName}</h2>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <CalendarGrid
                year={year}
                month={month}
                reservationsByDate={reservationsByDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              {/* Legend */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Bookings
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/40 inline-block" /> Today
                </span>
              </div>
            </div>

            {/* Side panel */}
            <div className="lg:col-span-2 space-y-4">
              {selectedDate && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-200">
                      {selectedDate === todayStr() ? "Today" : fmtDate(selectedDate)}
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
                      {selectedRsvs.length} booking{selectedRsvs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {selectedRsvs.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-slate-600">No reservations on this day</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRsvs.map((r) => (
                        <ReservationCard key={r.reservation_id} r={r} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Upcoming quick list */}
              {upcomingDates.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    Upcoming
                  </h3>
                  <div className="space-y-1">
                    {upcomingDates.map((date) => {
                      const rsvs = (reservationsByDate[date] ?? []).filter((r) => r.status === "confirmed");
                      if (!rsvs.length) return null;
                      const isToday = date === todayStr();
                      const guests  = rsvs.reduce((s, r) => s + r.party_size, 0);
                      return (
                        <button
                          key={date}
                          onClick={() => {
                            setSelectedDate(date);
                            setViewDate(new Date(date + "T12:00:00"));
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-all text-left"
                        >
                          <span className={`text-xs font-medium ${isToday ? "text-indigo-300" : "text-slate-300"}`}>
                            {isToday ? "Today" : fmtShort(date)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">{guests} guests</span>
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              {rsvs.length}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
