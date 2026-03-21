"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Re-use the csrf cookie already set; fetch it only if missing
    const cookie = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("csrf="));
    if (cookie) {
      setCsrfToken(cookie.split("=")[1]);
    } else {
      fetch("/api/auth/csrf")
        .then((r) => r.json())
        .then((d) => setCsrfToken(d.csrfToken));
    }
  }, []);

  async function handleLogout() {
    if (!csrfToken) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
      });
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading || !csrfToken}
      className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
