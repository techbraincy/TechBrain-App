"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Coffee,
  CalendarDays,
  Sheet,
  Users,
  Database,
  LogOut,
  Zap,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  username: string;
  role: "user" | "superadmin";
  accountType: string | null;
  hasSheets?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
        ${
          isActive
            ? "nav-active bg-indigo-600/15 text-indigo-300"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        }
      `}
    >
      <item.icon
        className={`w-4 h-4 flex-shrink-0 transition-colors ${
          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      <span>{item.label}</span>
      {isActive && (
        <ChevronRight className="w-3 h-3 ml-auto text-indigo-500 opacity-60" />
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
      {children}
    </p>
  );
}

export default function Sidebar({ username, role, accountType, hasSheets }: SidebarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
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
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
      });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  // Determine which sections to show
  const showOrders =
    role === "superadmin" || !accountType || accountType === "caffe";
  const showReservations =
    role === "superadmin" || !accountType || accountType === "restaurant";
  const showSheets = hasSheets || role === "superadmin";

  // Account type label for the sidebar header accent
  const accountLabel =
    role === "superadmin"
      ? "Superadmin"
      : accountType === "caffe"
      ? "Demo Caffe"
      : accountType === "restaurant"
      ? "Demo Restaurant"
      : "Workspace";

  const accountColor =
    role === "superadmin"
      ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
      : accountType === "caffe"
      ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
      : accountType === "restaurant"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : "text-slate-400 bg-slate-500/10 border-slate-500/20";

  return (
    <aside className="flex flex-col w-[240px] min-h-screen bg-slate-900 border-r border-slate-800 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
          <Zap className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-none">TechBrain</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Operations</p>
        </div>
      </div>

      {/* Account badge */}
      <div className="px-4 py-3 border-b border-slate-800">
        <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-lg border ${accountColor}`}>
          {accountLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {/* Main */}
        <div className="space-y-0.5">
          <SectionLabel>Main</SectionLabel>
          <NavLink item={{ label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true }} />
        </div>

        {/* Operations */}
        {(showOrders || showReservations || showSheets) && (
          <div className="space-y-0.5">
            <SectionLabel>Operations</SectionLabel>
            {showOrders && (
              <NavLink item={{ label: "Orders", href: "/dashboard/orders", icon: Coffee }} />
            )}
            {showReservations && (
              <NavLink item={{ label: "Reservations", href: "/dashboard/reservations", icon: CalendarDays }} />
            )}
            {showSheets && (
              <NavLink item={{ label: "Sheets", href: "/dashboard/sheets", icon: Sheet }} />
            )}
          </div>
        )}

        {/* Admin section */}
        {role === "superadmin" && (
          <div className="space-y-0.5">
            <SectionLabel>Admin</SectionLabel>
            <NavLink item={{ label: "Users", href: "/admin", icon: Users, exact: true }} />
            <NavLink item={{ label: "Sheet Registry", href: "/admin/sheets", icon: Database }} />
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-indigo-400 uppercase">
              {username.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 truncate leading-none">{username}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
