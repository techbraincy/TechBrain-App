"use client";

import { useState } from "react";
import { Coffee, CalendarDays, Plus, Trash2, Building2, X } from "lucide-react";
import type { Tenant } from "@/types/db";
import { useToast, useConfirm } from "@/components/ui/toast";

async function getCsrf(): Promise<string> {
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
  if (cookie) return decodeURIComponent(cookie.split("=")[1]);
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).csrfToken;
}

const TYPE_STYLES = {
  caffe:      { color: "text-orange-700 bg-orange-50 border-orange-200",  icon: Coffee,       label: "Caffe" },
  restaurant: { color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CalendarDays, label: "Restaurant" },
};

export default function TenantsTable({ tenants: initial }: { tenants: Tenant[] }) {
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const [tenants, setTenants] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"caffe" | "restaurant">("caffe");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Failed to create tenant."); return; }
      setTenants((prev) => [...prev, data.tenant]);
      setShowCreate(false);
      setName("");
      setType("caffe");
      success("Tenant created", `"${data.tenant.name}" is ready.`);
    } catch {
      setCreateError("An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, tenantName: string) {
    const ok = await confirm({
      title: `Delete "${tenantName}"?`,
      message: "Users assigned to this tenant will lose their tenant link. Their data rows (orders/reservations) are kept but will become unlinked.",
      confirmLabel: "Delete tenant",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf },
      });
      if (res.ok) {
        setTenants((prev) => prev.filter((t) => t.id !== id));
        success("Tenant deleted");
      } else {
        const d = await res.json();
        toastError("Delete failed", d.error ?? "Something went wrong.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} tenant{tenants.length !== 1 ? "s" : ""} — each isolates its own data</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
        >
          <Plus className="w-4 h-4" />
          New Tenant
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-gray-400 text-sm">
                  No tenants yet. Create one to start isolating data per business.
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const style = TYPE_STYLES[t.type];
              const Icon = style.icon;
              return (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${style.color}`}>
                      <Icon className="w-3 h-3" />
                      {style.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono text-gray-400">{t.id.slice(0, 8)}…</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      disabled={deletingId === t.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === t.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 animate-scale-in"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.16)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">New Tenant</h2>
                <p className="text-xs text-gray-500 mt-0.5">A tenant groups a business and its data</p>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Business Name</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="e.g. Blue Bottle Coffee" disabled={creating} autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["caffe", "restaurant"] as const).map((t) => {
                    const s = TYPE_STYLES[t];
                    const Icon = s.icon;
                    return (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          type === t ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}>
                        <Icon className="w-4 h-4" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} disabled={creating}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !name.trim()}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
                  {creating ? "Creating…" : "Create Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
