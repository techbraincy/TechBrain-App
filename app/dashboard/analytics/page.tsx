"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, Coffee, CheckCircle2, Clock, RefreshCw, Minus } from "lucide-react";

interface DayData  { date: string; total: number; done: number }
interface HourData { hour: number; count: number }
interface Analytics {
  byDay: DayData[];
  byHour: HourData[];
  totalAll: number;
  totalDone: number;
  totalPending: number;
  priorTotal: number;
  priorDone: number;
  avgPerDay: number;
  days: number;
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtHour(h: number) {
  if (h === 0)  return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function delta(current: number, prior: number): { pct: number; dir: "up" | "down" | "flat" } {
  if (prior === 0) return { pct: 0, dir: "flat" };
  const pct = Math.round(((current - prior) / prior) * 100);
  return { pct: Math.abs(pct), dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function DeltaBadge({ current, prior }: { current: number; prior: number }) {
  const { pct, dir } = delta(current, prior);
  if (dir === "flat" || prior === 0) return (
    <span className="flex items-center gap-0.5 text-[10px] text-slate-600"><Minus className="w-2.5 h-2.5" /> —</span>
  );
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${dir === "up" ? "text-green-400" : "text-red-400"}`}>
      {dir === "up" ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pct}% vs prior
    </span>
  );
}

function BarChart({
  data, valueKey, labelKey, color, height = 160, labelEvery = 1,
}: {
  data: Record<string, number | string>[];
  valueKey: string;
  labelKey: string;
  color: string;
  height?: number;
  labelEvery?: number;
}) {
  const values = data.map((d) => Number(d[valueKey]));
  const maxVal = Math.max(...values, 1);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 min-w-0" style={{ height: `${height}px`, minWidth: `${data.length * 18}px` }}>
        {data.map((d, i) => {
          const val = Number(d[valueKey]);
          const pct = (val / maxVal) * 100;
          return (
            <div key={i} className="group flex flex-col items-center gap-1 flex-1 h-full justify-end relative">
              {val > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center justify-center bg-slate-700 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                  {val}
                </div>
              )}
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${color}`}
                style={{ height: `${pct}%`, minHeight: val > 0 ? "3px" : "0" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2" style={{ minWidth: `${data.length * 18}px` }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelEvery === 0 && (
              <span className="text-[9px] text-slate-600 truncate block">{String(d[labelKey])}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedDayChart({ data }: { data: DayData[] }) {
  const maxVal    = Math.max(...data.map((d) => d.total), 1);
  const labelEvery = data.length > 14 ? Math.ceil(data.length / 6) : 3;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-0.5 min-w-0" style={{ height: "160px", minWidth: `${data.length * 20}px` }}>
        {data.map((d, i) => {
          const totalPct = (d.total / maxVal) * 100;
          const donePct  = d.total > 0 ? (d.done / d.total) * 100 : 0;
          return (
            <div key={i} className="group flex flex-col items-center flex-1 h-full justify-end relative">
              {d.total > 0 && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-slate-700 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none gap-0.5">
                  <span className="font-semibold">{d.total} orders</span>
                  <span className="text-green-400">{d.done} done</span>
                </div>
              )}
              <div
                className="w-full rounded-t-md overflow-hidden flex flex-col-reverse"
                style={{ height: `${totalPct}%`, minHeight: d.total > 0 ? "3px" : "0" }}
              >
                <div className="w-full bg-indigo-500/30" style={{ flex: 1 }} />
                <div className="w-full bg-indigo-500" style={{ height: `${donePct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 mt-2" style={{ minWidth: `${data.length * 20}px` }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelEvery === 0 && (
              <span className="text-[9px] text-slate-600 block truncate">{fmtDate(d.date)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, delta: d }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string;
  delta?: { current: number; prior: number };
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-slate-100 mt-1 leading-none tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
          {d && <div className="mt-1.5"><DeltaBadge current={d.current} prior={d.prior} /></div>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}
      </div>
      <div className="h-52 rounded-2xl shimmer" />
      <div className="h-52 rounded-2xl shimmer" />
    </div>
  );
}

const PERIODS = [
  { value: 7,  label: "7d"  },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
] as const;

type Period = 7 | 14 | 30 | 90;

export default function AnalyticsPage() {
  const [data, setData]         = useState<Analytics | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod]     = useState<Period>(30);

  async function load(p: Period = period, silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/analytics/orders?days=${p}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(period); }, [period]);

  const peakHour = data
    ? data.byHour.reduce((best, h) => h.count > best.count ? h : best, { hour: 0, count: 0 })
    : null;

  const completionRate = data && data.totalAll > 0
    ? Math.round((data.totalDone / data.totalAll) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Last {period} days · Coffee orders</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-all ${
                  period === value
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => load(period, true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? <Skeleton /> : data && (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Orders" value={data.totalAll} sub={`~${data.avgPerDay}/day avg`}
              icon={Coffee} color="bg-indigo-500/10 text-indigo-400"
              delta={{ current: data.totalAll, prior: data.priorTotal }}
            />
            <StatCard
              label="Completed" value={data.totalDone} sub={`${completionRate}% rate`}
              icon={CheckCircle2} color="bg-green-500/10 text-green-400"
              delta={{ current: data.totalDone, prior: data.priorDone }}
            />
            <StatCard
              label="Pending" value={data.totalPending} sub="still open"
              icon={Clock} color="bg-orange-500/10 text-orange-400"
            />
            <StatCard
              label="Peak Hour" value={peakHour ? fmtHour(peakHour.hour) : "—"}
              sub={peakHour?.count ? `${peakHour.count} orders` : "no data"}
              icon={TrendingUp} color="bg-violet-500/10 text-violet-400"
            />
          </div>

          {/* Daily orders chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Daily Orders</h2>
                <p className="text-xs text-slate-500 mt-0.5">Last {period} days</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Done
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/30 inline-block" /> Pending
                </span>
              </div>
            </div>
            {data.byDay.every(d => d.total === 0) ? (
              <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No data yet</div>
            ) : (
              <StackedDayChart data={data.byDay} />
            )}
          </div>

          {/* Hourly chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-200">Orders by Hour</h2>
              <p className="text-xs text-slate-500 mt-0.5">When customers order most</p>
            </div>
            {data.byHour.every(h => h.count === 0) ? (
              <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No data yet</div>
            ) : (
              <BarChart
                data={data.byHour.map(h => ({ hour: fmtHour(h.hour), count: h.count }))}
                valueKey="count" labelKey="hour" color="bg-violet-500"
                height={160} labelEvery={2}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
