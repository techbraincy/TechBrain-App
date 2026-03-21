"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/types/db";
import CreateUserDialog from "./create-user-dialog";

interface UserTableProps {
  users: User[];
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
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New User
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex text-xs font-medium rounded px-2 py-0.5 ${
                      user.role === "superadmin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={deletingId === user.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === user.id ? "Deleting…" : "Delete"}
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
