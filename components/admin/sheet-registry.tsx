"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Sheet } from "@/types/db";

interface SheetRegistryProps {
  sheets: Sheet[];
}

async function getCsrf(): Promise<string> {
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
  if (cookie) return decodeURIComponent(cookie.split("=")[1]);
  const r = await fetch("/api/auth/csrf");
  const d = await r.json();
  return d.csrfToken;
}

export default function SheetRegistry({ sheets: initial }: SheetRegistryProps) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New sheet form
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [range, setRange] = useState("Sheet1");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/admin/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          spreadsheet_id: spreadsheetId,
          display_name: displayName,
          range_notation: range,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to register sheet.");
        return;
      }
      setSheets((prev) => [data.sheet, ...prev]);
      setShowForm(false);
      setSpreadsheetId("");
      setDisplayName("");
      setRange("Sheet1");
      router.refresh();
    } catch {
      setFormError("An unexpected error occurred.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(sheetId: string, name: string) {
    if (!confirm(`Delete sheet "${name}"? This will remove all user assignments.`)) return;
    setDeletingId(sheetId);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/sheets/${sheetId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf },
      });
      if (res.ok) {
        setSheets((prev) => prev.filter((s) => s.id !== sheetId));
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to delete sheet.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Register Sheet"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Register Google Sheet</h2>
          <p className="text-xs text-gray-500 mb-4">
            The spreadsheet ID is the long string in the Google Sheet URL:<br />
            <code className="bg-gray-100 px-1 rounded">
              docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
            </code>
          </p>
          <form onSubmit={handleCreate} className="space-y-3 max-w-lg">
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
              <input
                type="text"
                required
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                disabled={formLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Q1 Sales Report"
                disabled={formLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Range Notation
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sheet1 or Sheet1!A1:Z100"
                disabled={formLoading}
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {formLoading ? "Registering…" : "Register Sheet"}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Spreadsheet ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Range</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sheets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No sheets registered yet.
                </td>
              </tr>
            )}
            {sheets.map((sheet) => (
              <tr key={sheet.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{sheet.display_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[200px] truncate">
                  {sheet.spreadsheet_id}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{sheet.range_notation}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(sheet.id, sheet.display_name)}
                    disabled={deletingId === sheet.id}
                    className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                  >
                    {deletingId === sheet.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
