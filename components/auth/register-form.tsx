"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, User, Lock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterForm() {
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl bg-gray-50 border border-gray-200 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50";

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
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`${inputCls} pl-10 pr-4`}
            placeholder="Letters, numbers, underscores"
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
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} pl-10 pr-12`}
            placeholder="Min 12 chars · upper + lower + number"
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
        {/* Password hints */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {[
            { label: "12+ chars",  pass: password.length >= 12 },
            { label: "uppercase",  pass: /[A-Z]/.test(password) },
            { label: "lowercase",  pass: /[a-z]/.test(password) },
            { label: "number",     pass: /[0-9]/.test(password) },
          ].map(({ label, pass }) => (
            <span key={label} className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
              pass ? "text-green-600" : "text-gray-400"
            }`}>
              <CheckCircle2 className={`w-3 h-3 ${pass ? "opacity-100" : "opacity-30"}`} />
              {label}
            </span>
          ))}
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
            ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating account…</span></>
            : <span>Create account</span>
          }
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700 transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}
