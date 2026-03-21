"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User, Sheet } from "@/types/db";

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
  const router = useRouter();
  const [assignedIds, setAssignedIds] = useState(new Set(initial));
  const [newPassword, setNewPassword] = useState("");
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">← Users</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{user.username}</h1>
        <span className={`text-xs font-medium rounded px-2 py-0.5 ${user.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
          {user.role}
        </span>
      </div>

      {/* Sheet Assignments */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Sheet Access</h2>
        {allSheets.length === 0 ? (
          <p className="text-sm text-gray-400">No sheets registered yet. <Link href="/admin/sheets" className="text-blue-600 hover:underline">Add sheets →</Link></p>
        ) : (
          <div className="space-y-2">
            {allSheets.map((sheet) => {
              const assigned = assignedIds.has(sheet.id);
              return (
                <div key={sheet.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sheet.display_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{sheet.spreadsheet_id}</p>
                  </div>
                  <button
                    onClick={() => toggleSheet(sheet.id)}
                    disabled={assignLoading === sheet.id}
                    className={`text-xs font-semibold rounded px-3 py-1.5 transition-colors disabled:opacity-50 ${
                      assigned
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                        : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                    }`}
                  >
                    {assignLoading === sheet.id ? "…" : assigned ? "Assigned ✓" : "Assign"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Password Reset */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Reset Password</h2>
        <form onSubmit={handlePasswordReset} className="space-y-3 max-w-sm">
          {pwError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Password updated. All sessions for this user have been invalidated.
            </div>
          )}
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="New password (min 12 chars)"
            disabled={pwLoading}
          />
          <button
            type="submit"
            disabled={pwLoading || !newPassword}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {pwLoading ? "Updating…" : "Set New Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
