"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Coffee, CalendarDays, Sheet, Users,
  Database, LogOut, ChevronRight, Menu, X,
  BarChart2, History, UserCircle, Building2, Mic2,
} from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";
import type { FeatureKey, Permissions } from "@/types/db";
import { resolveAccess } from "@/lib/auth/permissions";

interface SidebarProps {
  username: string;
  role: "user" | "superadmin";
  accountType: string | null;
  hasSheets?: boolean;
  permissions: Permissions | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
        ${isActive
          ? "nav-active bg-violet-50 text-violet-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }
      `}
    >
      <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
        isActive ? "text-violet-600" : "text-gray-400 group-hover:text-gray-600"
      }`} />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white leading-none">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      {isActive && !item.badge && (
        <ChevronRight className="w-3 h-3 text-violet-400 opacity-60" />
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </p>
  );
}

function SidebarContent({
  username, role, accountType, hasSheets, permissions, onNavClick,
}: SidebarProps & { onNavClick?: () => void }) {
  const router = useRouter();
  const { error } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const access = resolveAccess(role, accountType, permissions);
  function hasPerm(key: FeatureKey): boolean {
    if (key === "sheets") return access.sheets || (hasSheets ?? false);
    return access[key];
  }

  const showOrdersBadge = hasPerm("orders");

  useEffect(() => {
    const cookie = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("csrf="));
    if (cookie) setCsrfToken(cookie.split("=")[1]);
    else fetch("/api/auth/csrf").then((r) => r.json()).then((d) => setCsrfToken(d.csrfToken));
  }, []);

  useEffect(() => {
    if (!showOrdersBadge) return;
    let mounted = true;
    async function fetchCount() {
      try {
        const res = await fetch("/api/orders/count");
        if (res.ok && mounted) {
          const d = await res.json();
          setPendingCount(d.pending ?? 0);
        }
      } catch { /* silent */ }
    }
    fetchCount();
    const iv = setInterval(fetchCount, 30_000);
    return () => { mounted = false; clearInterval(iv); };
  }, [showOrdersBadge]);

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
      error("Sign out failed", "Please try again.");
      setLoggingOut(false);
    }
  }

  const showOrders       = hasPerm("orders");
  const showReservations = hasPerm("reservations");
  const showAnalytics    = hasPerm("analytics");
  const showCalendar     = hasPerm("calendar");
  const showSheets       = hasPerm("sheets");
  const showHistory      = hasPerm("history");

  const accountLabel =
    role === "superadmin"         ? "Superadmin" :
    accountType === "caffe"       ? "Demo Caffe" :
    accountType === "restaurant"  ? "Demo Restaurant" : "Workspace";

  const accountColor =
    role === "superadmin"         ? "text-violet-700 bg-violet-50 border-violet-200" :
    accountType === "caffe"       ? "text-orange-700 bg-orange-50 border-orange-200" :
    accountType === "restaurant"  ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                                    "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 flex-shrink-0">
        <Image src="/icon-192.png" alt="TechBrain" width={32} height={32} className="rounded-lg" />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-none">TechBrain</p>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-none">Operations</p>
        </div>
      </div>

      {/* Account badge */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${accountColor}`}>
          {accountLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        <div className="space-y-0.5">
          <SectionLabel>Main</SectionLabel>
          <NavLink item={{ label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true }} onClick={onNavClick} />
        </div>

        {(showOrders || showReservations || showAnalytics || showCalendar || showSheets) && (
          <div className="space-y-0.5">
            <SectionLabel>Operations</SectionLabel>
            {showOrders       && <NavLink item={{ label: "Orders",       href: "/dashboard/orders",       icon: Coffee,       badge: pendingCount }} onClick={onNavClick} />}
            {showAnalytics    && <NavLink item={{ label: "Analytics",    href: "/dashboard/analytics",    icon: BarChart2 }}  onClick={onNavClick} />}
            {showReservations && <NavLink item={{ label: "Reservations", href: "/dashboard/reservations", icon: CalendarDays }} onClick={onNavClick} />}
            {showCalendar     && <NavLink item={{ label: "Calendar",     href: "/dashboard/calendar",     icon: CalendarDays }} onClick={onNavClick} />}
            {showHistory      && <NavLink item={{ label: "History",      href: "/dashboard/history",      icon: History }}    onClick={onNavClick} />}
            {showSheets       && <NavLink item={{ label: "Sheets",       href: "/dashboard/sheets",       icon: Sheet }}      onClick={onNavClick} />}
          </div>
        )}

        <div className="space-y-0.5">
          <SectionLabel>AI Voice</SectionLabel>
          <NavLink item={{ label: "Voice Agents", href: "/voice-agent", icon: Mic2, exact: false }} onClick={onNavClick} />
        </div>

        {role === "superadmin" && (
          <div className="space-y-0.5">
            <SectionLabel>Admin</SectionLabel>
            <NavLink item={{ label: "Users",          href: "/admin",          icon: Users,      exact: true }} onClick={onNavClick} />
            <NavLink item={{ label: "Tenants",        href: "/admin/tenants",  icon: Building2 }}             onClick={onNavClick} />
            <NavLink item={{ label: "Sheet Registry", href: "/admin/sheets",   icon: Database }}              onClick={onNavClick} />
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-white uppercase">{username.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate leading-none">{username}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{role}</p>
          </div>
        </div>
        <NavLink item={{ label: "Profile", href: "/dashboard/profile", icon: UserCircle }} onClick={onNavClick} />
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        data-print-hide
        className="hidden lg:flex flex-col w-[240px] min-h-screen bg-white border-r border-gray-200 flex-shrink-0"
        style={{ boxShadow: "1px 0 0 rgba(0,0,0,0.04)" }}
      >
        <SidebarContent {...props} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        data-print-hide
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <Image src="/icon-192.png" alt="TechBrain" width={28} height={28} className="rounded-lg" />
          <span className="text-sm font-bold text-gray-900">TechBrain</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <aside
            className="relative w-[280px] h-full bg-white border-r border-gray-200 flex flex-col"
            style={{ animation: "slide-in-left 0.25s cubic-bezier(0.16,1,0.3,1)", boxShadow: "4px 0 24px rgba(0,0,0,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent {...props} onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <style>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
