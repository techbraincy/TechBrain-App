"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/types/db";
import CreateUserDialog from "./create-user-dialog";
import { Plus, Trash2, Settings2, Shield, User as UserIcon, Coffee, CalendarDays, Clock } from "lucide-react";

interface UserTableProps {
  users: User[];
}

const ROLE_STYLES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  superadmin: { label: "Superadmin", icon: Shield, color: "text-violet-400 bg-violet-500/10 border-violet-500/25" },
  user: { label: "User", icon: UserIcon, color: "text-slate-400 bg-slate-800 border-slate-700" },
};

const ACCOUNT_STYLES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  caffe: { label: "Demo Caffe", icon: Coffee, color: "text-orange-400 bg-orange-500/10 border-orange-500/25" },
  restaurant: { label: "Demo Restaurant", icon: CalendarDays, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
};

function Badge({ type, value }: { type: "role" | "account"; value: string | null }) {
  const map = type === "role" ? ROLE_STYLES : ACCOUNT_STYLES;
  const config = value ? map[value] : null;
  if (!config) return <span className="text-xs text-slate-600">—</span>;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function UserTable({ users: initialUsers }: UserTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function getCsrf(): Promise<string> {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
    if (cookie) return decodeURIComponent(cookie.split("=")[1]);
    const r = await fetch("/api/auth/csrf");
    const d = await r.json();
    return d.csrfToken;
  }

  async function handleDelete(userId: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to delete user.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Header + create button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Users</h1>
          <p className="text-xs text-slate-500 mt-0.5">{users.length} member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Account</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-slate-500 text-sm">
                  No users yet. Create the first one.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-indigo-400 uppercase">
                        {user.username.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-slate-200">{user.username}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge type="role" value={user.role} />
                </td>
                <td className="px-5 py-4">
                  <Badge type="account" value={user.account_type ?? null} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-indigo-600/15 border border-slate-700 hover:border-indigo-500/30 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={deletingId === user.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === user.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={(user) => {
            setUsers((prev) => [user, ...prev]);
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
