"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, Database, Clock } from "lucide-react";

interface SheetDataTableProps {
  sheetId: string;
  displayName: string;
}

export default function SheetDataTable({ sheetId }: SheetDataTableProps) {
  const [data, setData]           = useState<string[][] | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [cached, setCached]       = useState(false);
  const [stale, setStale]         = useState(false);
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
      if (!res.ok) { const b = await res.json(); setError(b.error ?? "Failed to load sheet data."); return; }
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

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-11 rounded-xl shimmer" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-red-50 border border-red-200 rounded-2xl gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button onClick={() => fetchData(true)}
          className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-white px-3 py-1.5 rounded-lg transition-all font-medium">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
        <Database className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500 font-medium">This sheet is empty</p>
      </div>
    );
  }

  const [headerRow, ...rows] = data;

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${stale ? "bg-amber-500" : cached ? "bg-blue-500" : "bg-green-500"}`} />
          <span className="text-xs text-gray-500">
            {stale ? "Stale cache" : cached ? "Cached · refreshes every 5 min" : "Live data"}
          </span>
          {fetchedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400 border-l border-gray-200 pl-2 ml-0.5">
              <Clock className="w-3 h-3" />
              {fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 font-medium">
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 overflow-auto bg-white"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {(headerRow ?? []).map((cell, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors">
                {(headerRow ?? []).map((_, ci) => (
                  <td key={ci} className="px-4 py-3 text-gray-700 whitespace-nowrap text-sm">
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">
        {rows.length} row{rows.length !== 1 ? "s" : ""} · {headerRow?.length ?? 0} columns
      </p>
    </div>
  );
}
