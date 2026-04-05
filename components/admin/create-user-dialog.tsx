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
  const d = await r.json();
  return d.csrfToken;
}

const ACCOUNT_OPTIONS = [
  { value: "", label: "General access", icon: UserIcon, desc: "Can view sheets + all features" },
  { value: "caffe", label: "Demo Caffe", icon: Coffee, desc: "Orders only" },
  { value: "restaurant", label: "Demo Restaurant", icon: CalendarDays, desc: "Reservations only" },
];

export default function CreateUserDialog({ onClose, onCreated }: CreateUserDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<"user" | "superadmin">("user");
  const [accountType, setAccountType] = useState<"" | "caffe" | "restaurant">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          username,
          password,
          role,
          account_type: accountType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create user.");
        return;
      }
      onCreated(data.user);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Create New User</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add a team member to the workspace</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="e.g. john_doe"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-10 pr-12 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Min 12 chars · upper + lower + number"
                disabled={loading}
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
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(["user", "superadmin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    role === r
                      ? r === "superadmin"
                        ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                        : "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <Shield className={`w-3.5 h-3.5 ${role === r ? "" : "opacity-50"}`} />
                  {r === "superadmin" ? "Superadmin" : "User"}
                </button>
              ))}
            </div>
          </div>

          {/* Account type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Account Type</label>
            <div className="space-y-2">
              {ACCOUNT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = accountType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAccountType(opt.value as typeof accountType)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                      selected
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="min-w-0">
                      <p className={`font-medium text-sm ${selected ? "text-indigo-300" : "text-slate-300"}`}>{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selected ? "bg-indigo-500 border-indigo-400" : "border-slate-600"
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
