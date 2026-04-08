"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Lock, AlertCircle, Loader2 } from "lucide-react";

interface LoginFormProps {
  next?: string;
}

export default function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [csrfToken, setCsrfToken]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => setError("Failed to initialize. Please refresh."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csrfToken) { setError("Form not ready. Please refresh."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed. Please try again."); return; }

      if (data.role === "superadmin")              router.push(next ?? "/admin");
      else if (data.account_type === "caffe")      router.push(next ?? "/dashboard/orders");
      else if (data.account_type === "restaurant") router.push(next ?? "/dashboard/reservations");
      else                                         router.push(next ?? "/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-slide-down">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Username
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
            placeholder="Enter your username"
            disabled={loading}
            autoFocus
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-12 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
            placeholder="Enter your password"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={loading || !csrfToken}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
          }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in…</span></>
            : <span>Sign in</span>
          }
        </button>
      </div>
    </form>
  );
}
