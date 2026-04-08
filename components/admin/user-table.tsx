"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/types/db";
import CreateUserDialog from "./create-user-dialog";
import { useToast, useConfirm } from "@/components/ui/toast";
import { Plus, Trash2, Settings2, Shield, User as UserIcon, Coffee, CalendarDays, Clock } from "lucide-react";

const ROLE_STYLES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  superadmin: { label: "Superadmin", icon: Shield,    color: "text-violet-700 bg-violet-50 border-violet-200" },
  user:       { label: "User",       icon: UserIcon,  color: "text-gray-600 bg-gray-50 border-gray-200" },
};

const ACCOUNT_STYLES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  caffe:      { label: "Caffe",      icon: Coffee,       color: "text-orange-700 bg-orange-50 border-orange-200" },
  restaurant: { label: "Restaurant", icon: CalendarDays, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

function Badge({ type, value }: { type: "role" | "account"; value: string | null }) {
  const map = type === "role" ? ROLE_STYLES : ACCOUNT_STYLES;
  const config = value ? map[value] : null;
  if (!config) return <span className="text-xs text-gray-300">—</span>;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function UserTable({ users: initialUsers }: { users: User[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [users, setUsers]     = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function getCsrf(): Promise<string> {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrf="));
    if (cookie) return decodeURIComponent(cookie.split("=")[1]);
    const r = await fetch("/api/auth/csrf");
    return (await r.json()).csrfToken;
  }

  async function handleDelete(userId: string, username: string) {
    const ok = await confirm({
      title: `Delete "${username}"?`,
      message: "This permanently removes the user and all their sheet assignments. This cannot be undone.",
      confirmLabel: "Delete user",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(userId);
    try {
      const csrf = await getCsrf();
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        success("User deleted", `"${username}" has been removed.`);
      } else {
        const d = await res.json();
        error("Delete failed", d.error ?? "Something went wrong.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">User</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Joined</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-gray-400 text-sm">
                  No users yet. Create the first one.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                      <span className="text-[11px] font-bold text-white uppercase">{user.username.charAt(0)}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-5 py-4"><Badge type="role" value={user.role} /></td>
                <td className="px-5 py-4"><Badge type="account" value={user.account_type ?? null} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/users/${user.id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-violet-700 bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-2.5 py-1.5 rounded-lg transition-all">
                      <Settings2 className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={deletingId === user.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
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
            success("User created", `"${user.username}" is ready to log in.`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
