"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, User, Shield } from "lucide-react";
import { useToast } from "@/components/ui/toast";

async function getCsrfToken(): Promise<string> {
  const cookie = document.cookie.split("; ").find((r) => r.startsWith("csrf="))?.split("=")[1];
  if (cookie) return cookie;
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

function getHeaderValue(name: string): string {
  // Headers aren't accessible client-side; we read them from a meta-like API endpoint.
  return "";
}

export default function ProfilePage() {
  const { success, error: toastError } = useToast();

  const [username, setUsername] = useState("");
  const [role, setRole]         = useState("");

  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success_, setSuccess_]       = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setUsername(d.username); setRole(d.role); }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess_(false);
    setLoading(true);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update password.");
      } else {
        setSuccess_(true);
        setCurrentPw("");
        setNewPw("");
        success("Password updated", "Your new password is active.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const pwHints = [
    { label: "12+ chars",  pass: newPw.length >= 12 },
    { label: "uppercase",  pass: /[A-Z]/.test(newPw) },
    { label: "lowercase",  pass: /[a-z]/.test(newPw) },
    { label: "number",     pass: /[0-9]/.test(newPw) },
  ];

  const inputCls = "w-full rounded-xl bg-gray-50 border border-gray-200 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50";

  return (
    <div className="max-w-lg space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account settings</p>
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
          <span className="text-xl font-bold text-white uppercase">
            {username ? username.charAt(0) : <User className="w-6 h-6" />}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{username || "—"}</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border mt-1 ${
            role === "superadmin"
              ? "text-violet-700 bg-violet-50 border-violet-200"
              : "text-gray-600 bg-gray-100 border-gray-200"
          }`}>
            <Shield className="w-3 h-3" />
            {role || "user"}
          </span>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
            <Lock className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Change Password</h2>
            <p className="text-xs text-gray-400">Your other sessions will be signed out</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            {error}
          </div>
        )}
        {success_ && (
          <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" />
            Password updated successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className={`${inputCls} pl-10 pr-12`}
                placeholder="Your current password"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={`${inputCls} pl-10 pr-12`}
                placeholder="Min 12 chars · upper + lower + number"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPw && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {pwHints.map(({ label, pass }) => (
                  <span key={label} className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                    pass ? "text-green-600" : "text-gray-400"
                  }`}>
                    <CheckCircle2 className={`w-3 h-3 ${pass ? "opacity-100" : "opacity-30"}`} />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !currentPw || !newPw}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
