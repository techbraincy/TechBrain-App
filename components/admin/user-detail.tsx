"use client";

import { useState } from "react";
import Link from "next/link";
import type { User, Sheet } from "@/types/db";
import { ChevronLeft, Sheet as SheetIcon, Lock, CheckCircle2, AlertCircle, Plus, Minus, Eye, EyeOff } from "lucide-react";

interface UserDetailProps {
  user: User;
  allSheets: Sheet[];
  assignedSheetIds: string[];
}

async function getCsrf(): Promise<string> {
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
  if (cookie) return decodeURIComponent(cookie.split("=")[1]);
  const r = await fetch("/api/auth/csrf");
  const d = await r.json();
  return d.csrfToken;
}

export default function UserDetail({ user, allSheets, assignedSheetIds: initial }: UserDetailProps) {
  const [assignedIds, setAssignedIds] = useState(new Set(initial));
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState<string | null>(null);

  async function toggleSheet(sheetId: string) {
    setAssignLoading(sheetId);
    const csrf = await getCsrf();
    const isAssigned = assignedIds.has(sheetId);

    if (isAssigned) {
      const res = await fetch(`/api/admin/users/${user.id}/sheets/${sheetId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf },
      });
      if (res.ok) setAssignedIds((prev) => { const s = new Set(prev); s.delete(sheetId); return s; });
    } else {
      const res = await fetch(`/api/admin/users/${user.id}/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ sheet_id: sheetId }),
      });
      if (res.ok) setAssignedIds((prev) => new Set([...prev, sheetId]));
    }
    setAssignLoading(null);
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    setPwLoading(true);

    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? "Failed to reset password.");
      } else {
        setPwSuccess(true);
        setNewPassword("");
      }
    } catch {
      setPwError("An unexpected error occurred.");
    } finally {
      setPwLoading(false);
    }
  }

  const accountBadge = user.account_type === "caffe"
    ? { label: "Demo Caffe", color: "text-orange-400 bg-orange-500/10 border-orange-500/25" }
    : user.account_type === "restaurant"
    ? { label: "Demo Restaurant", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" }
    : null;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link href="/admin" className="hover:text-slate-300 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Users
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center">
            <span className="text-lg font-bold text-indigo-400 uppercase">{user.username.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{user.username}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md border ${
                user.role === "superadmin"
                  ? "text-violet-400 bg-violet-500/10 border-violet-500/25"
                  : "text-slate-400 bg-slate-800 border-slate-700"
              }`}>
                {user.role}
              </span>
              {accountBadge && (
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md border ${accountBadge.color}`}>
                  {accountBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sheet Assignments */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <SheetIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Sheet Access</h2>
              <p className="text-xs text-slate-500">{assignedIds.size} of {allSheets.length} assigned</p>
            </div>
          </div>

          {allSheets.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center">
              No sheets registered.{" "}
              <Link href="/admin/sheets" className="text-indigo-400 hover:text-indigo-300">Add sheets →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {allSheets.map((sheet) => {
                const assigned = assignedIds.has(sheet.id);
                const isLoading = assignLoading === sheet.id;

                return (
                  <div
                    key={sheet.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      assigned
                        ? "bg-indigo-500/5 border-indigo-500/20"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${assigned ? "text-slate-200" : "text-slate-400"}`}>
                        {sheet.display_name}
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono truncate mt-0.5">
                        {sheet.range_notation}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSheet(sheet.id)}
                      disabled={isLoading}
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ml-3 disabled:opacity-50 ${
                        assigned
                          ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/25 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25"
                          : "text-slate-400 bg-slate-800 border-slate-700 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/25"
                      }`}
                    >
                      {isLoading ? (
                        "…"
                      ) : assigned ? (
                        <><Minus className="w-3 h-3" /> Remove</>
                      ) : (
                        <><Plus className="w-3 h-3" /> Assign</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Password Reset */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Reset Password</h2>
              <p className="text-xs text-slate-500">Invalidates all active sessions</p>
            </div>
          </div>

          {pwError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Password updated. All sessions invalidated.
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPw ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-10 pr-12 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="New password (min 12 chars)"
                disabled={pwLoading}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={pwLoading || !newPassword}
              className="w-full rounded-xl bg-orange-600/80 hover:bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all"
            >
              {pwLoading ? "Updating…" : "Set New Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
