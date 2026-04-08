"use client";

import { useState } from "react";
import Link from "next/link";
import type { User, Sheet, FeatureKey, Permissions, Tenant } from "@/types/db";
import {
  ChevronLeft, Sheet as SheetIcon, Lock, CheckCircle2, AlertCircle,
  Plus, Minus, Eye, EyeOff, Coffee, CalendarDays, BarChart2,
  History, Database, LayoutDashboard, Building2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface UserDetailProps {
  user: User;
  allSheets: Sheet[];
  assignedSheetIds: string[];
  initialPermissions?: Permissions | null;
  allTenants?: Tenant[];
}

async function getCsrf(): Promise<string> {
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
  if (cookie) return decodeURIComponent(cookie.split("=")[1]);
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

const FEATURE_CONFIGS: { key: FeatureKey; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "orders",       label: "Orders",       icon: Coffee,         desc: "Live orders page" },
  { key: "reservations", label: "Reservations", icon: CalendarDays,   desc: "Reservations list" },
  { key: "analytics",    label: "Analytics",    icon: BarChart2,      desc: "Sales analytics" },
  { key: "calendar",     label: "Calendar",     icon: LayoutDashboard, desc: "Reservation calendar" },
  { key: "history",      label: "History",      icon: History,        desc: "Order & reservation history" },
  { key: "sheets",       label: "Sheets",       icon: Database,       desc: "Google Sheets data" },
];

export default function UserDetail({ user, allSheets, assignedSheetIds: initial, initialPermissions, allTenants = [] }: UserDetailProps) {
  const { success, error: toastError } = useToast();
  const [assignedIds, setAssignedIds] = useState(new Set(initial));
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState<string | null>(null);

  // Tenant state
  const [tenantId, setTenantId] = useState<string | null>(user.tenant_id ?? null);
  const [tenantLoading, setTenantLoading] = useState(false);

  // Permissions state: null = use account_type defaults
  const [permissions, setPermissions] = useState<Permissions | null>(initialPermissions ?? null);
  const [permLoading, setPermLoading] = useState(false);
  const [useCustomPerms, setUseCustomPerms] = useState(Boolean(initialPermissions));

  async function assignTenant(newTenantId: string | null) {
    setTenantLoading(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ tenant_id: newTenantId }),
      });
      if (res.ok) {
        setTenantId(newTenantId);
        success(newTenantId ? "Tenant assigned" : "Tenant removed");
      } else {
        const d = await res.json();
        toastError("Failed", d.error ?? "Could not update tenant.");
      }
    } catch {
      toastError("Network error");
    } finally {
      setTenantLoading(false);
    }
  }

  async function toggleSheet(sheetId: string) {
    setAssignLoading(sheetId);
    const csrf = await getCsrf();
    const isAssigned = assignedIds.has(sheetId);

    if (isAssigned) {
      const res = await fetch(`/api/admin/users/${user.id}/sheets/${sheetId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf },
      });
      if (res.ok) {
        setAssignedIds((prev) => { const s = new Set(prev); s.delete(sheetId); return s; });
        success("Access removed");
      }
    } else {
      const res = await fetch(`/api/admin/users/${user.id}/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ sheet_id: sheetId }),
      });
      if (res.ok) {
        setAssignedIds((prev) => new Set([...prev, sheetId]));
        success("Sheet assigned");
      }
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
        success("Password updated", "All active sessions have been invalidated.");
      }
    } catch {
      setPwError("An unexpected error occurred.");
    } finally {
      setPwLoading(false);
    }
  }

  async function toggleFeature(key: FeatureKey) {
    if (!useCustomPerms) return;
    const next: Permissions = { ...permissions };
    next[key] = !(next[key] ?? false);
    setPermissions(next);
    setPermLoading(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ permissions: next }),
      });
      if (res.ok) {
        success("Permissions saved");
      } else {
        toastError("Failed to save permissions");
        setPermissions(permissions); // revert
      }
    } catch {
      toastError("Network error");
      setPermissions(permissions);
    } finally {
      setPermLoading(false);
    }
  }

  async function handleToggleCustomPerms(enabled: boolean) {
    setUseCustomPerms(enabled);
    const newPerms = enabled
      ? { orders: false, reservations: false, analytics: false, calendar: false, history: false, sheets: false }
      : null;
    setPermissions(newPerms);
    setPermLoading(true);
    try {
      const csrf = await getCsrf();
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ permissions: newPerms }),
      });
      success(enabled ? "Custom permissions enabled" : "Reverted to account defaults");
    } catch {
      toastError("Failed to update");
    } finally {
      setPermLoading(false);
    }
  }

  const accountBadge = user.account_type === "caffe"
    ? { label: "Demo Caffe", color: "text-orange-700 bg-orange-50 border-orange-200" }
    : user.account_type === "restaurant"
    ? { label: "Demo Restaurant", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    : null;

  const inputCls = "w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-12 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50";

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin" className="hover:text-gray-800 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Users
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            <span className="text-lg font-bold text-white uppercase">{user.username.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md border ${
                user.role === "superadmin"
                  ? "text-violet-700 bg-violet-50 border-violet-200"
                  : "text-gray-600 bg-gray-100 border-gray-200"
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
        {/* Tenant Assignment */}
        {allTenants.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Tenant</h2>
                <p className="text-xs text-gray-400">Which business this user belongs to</p>
              </div>
            </div>

            <div className="space-y-2">
              {/* No tenant option */}
              <button
                onClick={() => assignTenant(null)}
                disabled={tenantLoading}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                  tenantId === null ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: tenantId === null ? "#6d28d9" : "#d1d5db", backgroundColor: tenantId === null ? "#6d28d9" : "transparent" }}>
                  {tenantId === null && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={`text-sm font-medium ${tenantId === null ? "text-gray-900" : "text-gray-500"}`}>No tenant</p>
                  <p className="text-xs text-gray-400">Uses account_type defaults</p>
                </div>
              </button>

              {allTenants.map((t) => {
                const selected = tenantId === t.id;
                const Icon = t.type === "caffe" ? Coffee : CalendarDays;
                return (
                  <button
                    key={t.id}
                    onClick={() => assignTenant(t.id)}
                    disabled={tenantLoading}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                      selected ? "bg-violet-50 border-violet-300" : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ borderColor: selected ? "#6d28d9" : "#d1d5db", backgroundColor: selected ? "#6d28d9" : "transparent" }}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? "text-violet-600" : "text-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${selected ? "text-violet-800" : "text-gray-700"}`}>{t.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{t.type}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Feature Permissions */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Feature Access</h2>
                <p className="text-xs text-gray-400">Control which sections this user sees</p>
              </div>
            </div>
          </div>

          {/* Toggle custom vs account defaults */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-700">Custom permissions</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {useCustomPerms ? "Overrides account type defaults" : "Using account type defaults"}
              </p>
            </div>
            <button
              onClick={() => handleToggleCustomPerms(!useCustomPerms)}
              disabled={permLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                useCustomPerms ? "bg-violet-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                useCustomPerms ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          {useCustomPerms && (
            <div className="space-y-2">
              {FEATURE_CONFIGS.map(({ key, label, icon: Icon, desc }) => {
                const enabled = permissions?.[key] ?? false;
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                      enabled ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${enabled ? "text-violet-600" : "text-gray-400"}`} />
                      <div>
                        <p className={`text-sm font-medium ${enabled ? "text-violet-800" : "text-gray-600"}`}>{label}</p>
                        <p className="text-[10px] text-gray-400">{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFeature(key)}
                      disabled={permLoading}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                        enabled ? "bg-violet-600" : "bg-gray-300"
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        enabled ? "translate-x-4.5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!useCustomPerms && (
            <p className="text-xs text-gray-400 text-center py-2">
              Enable custom permissions above to control individual features.
            </p>
          )}
        </section>

        {/* Right column: Sheet Access + Password */}
        <div className="space-y-6">
          {/* Sheet Assignments */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <SheetIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Sheet Access</h2>
                <p className="text-xs text-gray-400">{assignedIds.size} of {allSheets.length} assigned</p>
              </div>
            </div>

            {allSheets.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">
                No sheets registered.{" "}
                <Link href="/admin/sheets" className="text-violet-600 hover:text-violet-700">Add sheets →</Link>
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
                        assigned ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${assigned ? "text-indigo-800" : "text-gray-600"}`}>
                          {sheet.display_name}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                          {sheet.range_notation}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSheet(sheet.id)}
                        disabled={isLoading}
                        className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ml-3 disabled:opacity-50 ${
                          assigned
                            ? "text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            : "text-gray-500 bg-white border-gray-200 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
                        }`}
                      >
                        {isLoading ? "…" : assigned ? <><Minus className="w-3 h-3" /> Remove</> : <><Plus className="w-3 h-3" /> Assign</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Password Reset */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
                <Lock className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Reset Password</h2>
                <p className="text-xs text-gray-400">Invalidates all active sessions</p>
              </div>
            </div>

            {pwError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Password updated. All sessions invalidated.
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                  placeholder="New password (min 12 chars)"
                  disabled={pwLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={pwLoading || !newPassword}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all bg-orange-500 hover:bg-orange-600"
              >
                {pwLoading ? "Updating…" : "Set New Password"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
