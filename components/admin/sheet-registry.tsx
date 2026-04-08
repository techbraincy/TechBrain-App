"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Sheet } from "@/types/db";
import { useToast, useConfirm } from "@/components/ui/toast";
import { Plus, Trash2, X, Database, AlertCircle } from "lucide-react";

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
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const [sheets, setSheets] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        body: JSON.stringify({ spreadsheet_id: spreadsheetId, display_name: displayName, range_notation: range }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to register sheet.");
        return;
      }
      setSheets((prev) => [data.sheet, ...prev]);
      setShowForm(false);
      setSpreadsheetId(""); setDisplayName(""); setRange("Sheet1");
      success("Sheet registered", `"${displayName}" is now available to assign.`);
      router.refresh();
    } catch {
      setFormError("An unexpected error occurred.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(sheetId: string, name: string) {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: "This removes the sheet and all user assignments permanently.",
      confirmLabel: "Delete sheet",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(sheetId);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/sheets/${sheetId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf },
      });
      if (res.ok) {
        setSheets((prev) => prev.filter((s) => s.id !== sheetId));
        success("Sheet deleted", `"${name}" has been removed.`);
      } else {
        const d = await res.json();
        toastError("Delete failed", d.error ?? "Something went wrong.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Sheet Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">{sheets.length} registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
            showForm
              ? "bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
          }`}
        >
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Register Sheet</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 animate-slide-down">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Register Google Sheet</h2>
            <p className="text-xs text-slate-500 mt-1">
              Find the spreadsheet ID in the URL:{" "}
              <code className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
              </code>
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Spreadsheet ID</label>
                <input
                  type="text"
                  required
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  disabled={formLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="e.g. Q1 Sales Report"
                  disabled={formLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Range Notation</label>
                <input
                  type="text"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="Sheet1 or Sheet1!A1:Z100"
                  disabled={formLoading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all"
            >
              {formLoading ? "Registering…" : "Register Sheet"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {sheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Database className="w-8 h-8 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">No sheets registered yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-all"
            >
              Register the first sheet →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Spreadsheet ID</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Range</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-200">{sheet.display_name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500 max-w-[200px] truncate">{sheet.spreadsheet_id}</td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 rounded px-2 py-0.5">
                      {sheet.range_notation}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(sheet.id, sheet.display_name)}
                      disabled={deletingId === sheet.id}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === sheet.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
