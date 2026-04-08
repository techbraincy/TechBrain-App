"use client";

import { useState } from "react";
import type { User } from "@/types/db";
import { X, User as UserIcon, Lock, Shield, Coffee, CalendarDays, Eye, EyeOff } from "lucide-react";

interface CreateUserDialogProps {
  onClose: () => void;
  onCreated: (user: User) => void;
}

async function getCsrf(): Promise<string> {
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
  if (cookie) return decodeURIComponent(cookie.split("=")[1]);
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

const ACCOUNT_OPTIONS = [
  { value: "", label: "General access", icon: UserIcon, desc: "Can view sheets + all features" },
  { value: "caffe", label: "Demo Caffe", icon: Coffee, desc: "Orders only" },
  { value: "restaurant", label: "Demo Restaurant", icon: CalendarDays, desc: "Reservations only" },
];

export default function CreateUserDialog({ onClose, onCreated }: CreateUserDialogProps) {
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [role, setRole]           = useState<"user" | "superadmin">("user");
  const [accountType, setAccountType] = useState<"" | "caffe" | "restaurant">("");
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ username, password, role, account_type: accountType || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }
      onCreated(data.user);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl bg-gray-50 border border-gray-200 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md animate-scale-in border border-gray-200"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.16)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Create New User</h2>
            <p className="text-xs text-gray-500 mt-0.5">Add a team member to the workspace</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className={`${inputCls} pl-10 pr-4`} placeholder="e.g. john_doe" disabled={loading} autoFocus />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-12`} placeholder="Min 12 chars · upper + lower + number" disabled={loading} />
              <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(["user", "superadmin"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    role === r
                      ? r === "superadmin"
                        ? "bg-violet-50 border-violet-300 text-violet-700"
                        : "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Shield className={`w-3.5 h-3.5 ${role === r ? "" : "opacity-40"}`} />
                  {r === "superadmin" ? "Superadmin" : "User"}
                </button>
              ))}
            </div>
          </div>

          {/* Account type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Account Type</label>
            <div className="space-y-2">
              {ACCOUNT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = accountType === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setAccountType(opt.value as typeof accountType)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                      selected
                        ? "bg-violet-50 border-violet-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? "text-violet-600" : "text-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-sm ${selected ? "text-violet-800" : "text-gray-700"}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                      selected ? "bg-violet-600 border-violet-600" : "border-gray-300"
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
