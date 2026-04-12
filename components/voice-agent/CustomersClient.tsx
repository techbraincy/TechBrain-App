"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Users, Phone, Mail, Globe, ShoppingBag, Calendar, TrendingUp } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferred_language: string | null;
  notes: string | null;
  total_orders: number;
  total_reservations: number;
  total_spend: string | null;
  last_seen_at: string | null;
  created_at: string;
}

interface Props {
  businessId: string;
  businessName: string;
  primaryColor?: string;
  customers: Customer[];
}

function hex(color: string | undefined, fallback = "#7c3aed") {
  if (!color || color === "#ffffff" || color === "#fff") return fallback;
  return color;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

function fmtSpend(val: string | null) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return "—";
  return `€${n.toFixed(2)}`;
}

const LANG_LABELS: Record<string, string> = {
  el: "GR", en: "EN", de: "DE", fr: "FR", it: "IT", es: "ES", ru: "RU", ar: "AR",
};

export default function CustomersClient({ businessId, businessName, primaryColor, customers }: Props) {
  const primary = hex(primaryColor);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalSpend = customers.reduce((sum, c) => sum + (parseFloat(c.total_spend ?? "0") || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: primary }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/voice-agent/${businessId}`} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-white/60 text-xs">{businessName}</p>
            <h1 className="text-lg font-bold text-white">Customers</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-white/80 text-sm">
            <Users className="w-4 h-4" />
            <span>{customers.length} total</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Users className="w-4 h-4 text-violet-500" />
            <span className="font-semibold text-gray-900">{customers.length}</span> customers
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <ShoppingBag className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-gray-900">{totalOrders}</span> orders
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-gray-900">€{totalSpend.toFixed(2)}</span> revenue
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* List panel */}
        <div className="w-full md:w-96 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {/* Customer rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">No customers found</div>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === c.id ? "bg-violet-50 border-l-2" : ""}`}
                style={selected?.id === c.id ? { borderLeftColor: primary } : {}}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.phone ?? c.email ?? "No contact"}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-700">{fmtSpend(c.total_spend)}</p>
                    <p className="text-xs text-gray-400">{c.total_orders} orders</p>
                  </div>
                </div>
                <p className="text-xs text-gray-300 mt-1">Last seen {fmtDate(c.last_seen_at)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden md:flex flex-1 items-start p-6">
          {!selected ? (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a customer</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg space-y-4">
              {/* Name + badges */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Since {fmtDate(selected.created_at)}</p>
                  </div>
                  {selected.preferred_language && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: primary }}>
                      {LANG_LABELS[selected.preferred_language] ?? selected.preferred_language.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-violet-600">
                      <Phone className="w-4 h-4 text-gray-400" /> {selected.phone}
                    </a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-violet-600">
                      <Mail className="w-4 h-4 text-gray-400" /> {selected.email}
                    </a>
                  )}
                  {selected.preferred_language && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4 text-gray-400" /> Prefers {selected.preferred_language}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                  <p className="text-lg font-bold text-gray-900">{selected.total_orders}</p>
                  <p className="text-xs text-gray-400">Orders</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <p className="text-lg font-bold text-gray-900">{selected.total_reservations}</p>
                  <p className="text-xs text-gray-400">Reservations</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <p className="text-lg font-bold text-gray-900">{fmtSpend(selected.total_spend)}</p>
                  <p className="text-xs text-gray-400">Spent</p>
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  📝 {selected.notes}
                </div>
              )}

              <p className="text-xs text-gray-300 text-center">Last seen {fmtDate(selected.last_seen_at)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
