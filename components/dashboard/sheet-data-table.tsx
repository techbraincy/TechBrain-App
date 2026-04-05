"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, Sheet, Database, Clock } from "lucide-react";

interface SheetDataTableProps {
  sheetId: string;
  displayName: string;
}

export default function SheetDataTable({ sheetId, displayName }: SheetDataTableProps) {
  const [data, setData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (bust) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/sheets/${sheetId}/data${bust ? "?bust=1" : ""}`,
        { cache: bust ? "no-store" : "default" }
      );
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to load sheet data.");
        return;
      }
      const body = await res.json();
      setData(body.values ?? []);
      setCached(body.cached ?? false);
      setStale(body.stale ?? false);
      setFetchedAt(new Date());
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sheetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-red-500/5 border border-red-500/20 rounded-2xl gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center">
        <Database className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-sm text-slate-500">This sheet is empty.</p>
      </div>
    );
  }

  const [headerRow, ...rows] = data;

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${stale ? "bg-yellow-500" : cached ? "bg-blue-500" : "bg-green-500"}`} />
          <span className="text-xs text-slate-500">
            {stale
              ? "Stale cache (live fetch failed)"
              : cached
              ? "Cached · refreshes every 5 min"
              : "Live data"}
          </span>
          {fetchedAt && (
            <>
              <span className="text-slate-700">·</span>
              <Clock className="w-3 h-3 text-slate-600" />
              <span className="text-xs text-slate-600">
                {fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 overflow-auto bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {(headerRow ?? []).map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap bg-slate-800/50"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-colors"
              >
                {(headerRow ?? []).map((_, ci) => (
                  <td
                    key={ci}
                    className="px-4 py-3 text-slate-300 whitespace-nowrap text-sm"
                  >
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600 text-right">
        {rows.length} row{rows.length !== 1 ? "s" : ""} · {headerRow?.length ?? 0} columns
      </p>
    </div>
  );
}
