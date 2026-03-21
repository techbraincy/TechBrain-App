"use client";

import { useEffect, useState, useCallback } from "react";

interface SheetDataTableProps {
  sheetId: string;
  displayName: string;
}

export default function SheetDataTable({ sheetId }: SheetDataTableProps) {
  const [data, setData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [stale, setStale] = useState(false);

  const fetchData = useCallback(
    async (bust = false) => {
      setLoading(true);
      setError(null);

      const url = `/api/sheets/${sheetId}/data${bust ? "?bust=1" : ""}`;
      try {
        const res = await fetch(url, { cache: bust ? "no-store" : "default" });
        if (!res.ok) {
          const body = await res.json();
          setError(body.error ?? "Failed to load sheet data.");
          return;
        }
        const body = await res.json();
        setData(body.values ?? []);
        setCached(body.cached ?? false);
        setStale(body.stale ?? false);
      } catch {
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [sheetId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Loading sheet data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700 text-sm font-medium">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500 text-sm">This sheet is empty.</p>
      </div>
    );
  }

  const [headerRow, ...rows] = data;

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          {stale
            ? "Showing stale cache (live fetch failed)"
            : cached
            ? "Showing cached data (refreshes every 5 min)"
            : "Live data"}
        </p>
        <button
          onClick={() => fetchData(true)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {(headerRow ?? []).map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap"
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
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                {(headerRow ?? []).map((_, ci) => (
                  <td
                    key={ci}
                    className="px-4 py-3 text-gray-700 whitespace-nowrap"
                  >
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400 text-right">
        {rows.length} row{rows.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
