"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, ChevronRight, Package, Bike,
  Phone, MapPin, Utensils, Truck, Star
} from "lucide-react";
import Link from "next/link";
import type { Business } from "@/types/agent";

// ── Status config ─────────────────────────────────────────────────────────────
const DELIVERY_STEPS = [
  { key: "pending",          label: "Order received",        labelEl: "Η παραγγελία ελήφθη",    icon: Clock },
  { key: "accepted",         label: "Accepted",              labelEl: "Εγκρίθηκε",               icon: CheckCircle2 },
  { key: "preparing",        label: "Preparing",             labelEl: "Ετοιμάζεται",              icon: Utensils },
  { key: "ready",            label: "Ready",                 labelEl: "Έτοιμο",                   icon: Package },
  { key: "out_for_delivery", label: "Out for delivery",      labelEl: "Σε διανομή",               icon: Truck },
  { key: "completed",        label: "Delivered",             labelEl: "Παραδόθηκε",               icon: Star },
];

const TAKEAWAY_STEPS = [
  { key: "pending",    label: "Order received",  labelEl: "Η παραγγελία ελήφθη", icon: Clock },
  { key: "accepted",   label: "Accepted",        labelEl: "Εγκρίθηκε",           icon: CheckCircle2 },
  { key: "preparing",  label: "Preparing",       labelEl: "Ετοιμάζεται",          icon: Utensils },
  { key: "ready",      label: "Ready for pickup",labelEl: "Έτοιμο για παραλαβή", icon: Package },
  { key: "completed",  label: "Completed",       labelEl: "Ολοκληρώθηκε",         icon: Star },
];

const REJECTED_STEP = { key: "rejected", label: "Not available", labelEl: "Μη διαθέσιμο", icon: Clock };
const CANCELLED_STEP = { key: "cancelled", label: "Cancelled", labelEl: "Ακυρώθηκε", icon: Clock };

function hex(color: string | undefined, fallback = "#7c3aed") {
  if (!color || color === "#ffffff" || color === "#fff") return fallback;
  return color;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("el", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("el", { weekday: "short", day: "numeric", month: "short" });
}

interface HistoryEntry {
  status: string;
  note: string | null;
  created_at: string;
}

interface Order {
  id: string;
  customer_name: string;
  order_type: "delivery" | "takeaway";
  items: { name: string; quantity: number; price?: string }[];
  items_summary: string | null;
  total_amount: string | null;
  status: string;
  estimated_ready_at: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  delivery_address: string | null;
  special_instructions: string | null;
}

interface Props {
  business: Pick<Business, "business_name" | "branding_settings" | "phone_number" | "address">;
  order: Order;
  history: HistoryEntry[];
  businessId: string;
  orderId: string;
}

export default function OrderTrackingClient({ business, order: initialOrder, history: initialHistory, businessId, orderId }: Props) {
  const [order,   setOrder]   = useState(initialOrder);
  const [history, setHistory] = useState(initialHistory);
  const primary = hex(business.branding_settings?.primary_color);

  const steps = order.order_type === "delivery" ? DELIVERY_STEPS : TAKEAWAY_STEPS;
  const isRejected  = order.status === "rejected";
  const isCancelled = order.status === "cancelled";
  const currentIdx  = steps.findIndex((s) => s.key === order.status);

  // SSE for live updates
  useEffect(() => {
    const es = new EventSource(`/api/portal/${businessId}/orders/${orderId}/stream`);
    es.addEventListener("message", async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "status") {
        // Refetch full order
        const res = await fetch(`/api/portal/${businessId}/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
          setHistory(data.history ?? []);
        }
      }
    });
    return () => es.close();
  }, [businessId, orderId]);

  const estimatedLabel = () => {
    if (!order.estimated_ready_at) return null;
    const eta = new Date(order.estimated_ready_at);
    const now = new Date();
    const diffMins = Math.round((eta.getTime() - now.getTime()) / 60_000);
    if (diffMins <= 0) return "Should be ready soon";
    return `Ready in ~${diffMins} min (${fmtTime(order.estimated_ready_at)})`;
  };

  const statusMessage = () => {
    if (isRejected)  return { title: "Order not accepted", sub: "The business couldn't fulfill your order. Please contact them directly.", color: "text-red-600" };
    if (isCancelled) return { title: "Order cancelled", sub: "This order has been cancelled.", color: "text-gray-500" };
    switch (order.status) {
      case "pending":          return { title: "Waiting for approval", sub: "Your order has been received and is awaiting business confirmation.", color: "text-amber-600" };
      case "accepted":         return { title: "Order confirmed!", sub: order.estimated_ready_at ? estimatedLabel()! : "Your order has been accepted.", color: "text-emerald-600" };
      case "preparing":        return { title: "Being prepared", sub: order.estimated_ready_at ? estimatedLabel()! : "Your order is in the kitchen.", color: "text-blue-600" };
      case "ready":            return { title: order.order_type === "delivery" ? "Ready — out soon!" : "Ready for pickup!", sub: order.order_type === "delivery" ? "A driver will pick up your order shortly." : "Your order is ready. Come pick it up!", color: "text-emerald-600" };
      case "out_for_delivery": return { title: "On its way!", sub: "Your order is out for delivery.", color: "text-violet-600" };
      case "completed":        return { title: "Delivered!", sub: "Enjoy your order. Thank you!", color: "text-emerald-700" };
      default:                 return { title: order.status, sub: "", color: "text-gray-600" };
    }
  };

  const msg = statusMessage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: primary }}>
        <div className="max-w-lg mx-auto px-4 py-4">
          <Link href={`/portal/${businessId}`} className="text-white/70 hover:text-white text-xs mb-1 block">
            ← {business.business_name}
          </Link>
          <h1 className="text-lg font-bold text-white">Order Tracking</h1>
          <p className="text-white/60 text-xs font-mono mt-0.5">#{orderId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Status banner */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center"
             style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p className={`text-lg font-bold ${msg.color}`}>{msg.title}</p>
          <p className="text-sm text-gray-500 mt-1">{msg.sub}</p>
          {order.status === "pending" && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Waiting for business response
            </div>
          )}
        </div>

        {/* Progress steps */}
        {!isRejected && !isCancelled && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5"
               style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="space-y-0">
              {steps.map((step, idx) => {
                const done    = idx < currentIdx || (idx === currentIdx && order.status === "completed");
                const current = idx === currentIdx && !done;
                const upcoming = idx > currentIdx;

                // Find timestamp from history
                const histEntry = history.find((h) => h.status === step.key);

                return (
                  <div key={step.key} className="flex items-start gap-4">
                    {/* Line + circle */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done    ? "text-white" :
                        current ? "text-white ring-4 ring-opacity-20" :
                                  "bg-gray-100 text-gray-300"
                      }`} style={done || current ? { backgroundColor: primary } : {}}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      {idx < steps.length - 1 && (
                        <div className={`w-0.5 h-8 mt-1 ${done ? "opacity-100" : "opacity-20"}`}
                             style={done ? { backgroundColor: primary } : { backgroundColor: "#d1d5db" }} />
                      )}
                    </div>

                    {/* Label */}
                    <div className="pb-8 pt-1 flex-1">
                      <p className={`text-sm font-semibold ${upcoming ? "text-gray-300" : current ? "text-gray-900" : "text-gray-500"}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs ${upcoming ? "text-gray-200" : "text-gray-400"}`}>
                        {step.labelEl}
                      </p>
                      {histEntry && (
                        <p className="text-xs text-gray-400 mt-0.5">{fmtTime(histEntry.created_at)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
             style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h2 className="text-sm font-semibold text-gray-800">Order details</h2>

          <div className="flex items-center gap-2">
            {order.order_type === "delivery"
              ? <Bike className="w-4 h-4 text-orange-500" />
              : <Package className="w-4 h-4 text-blue-500" />}
            <span className="text-sm text-gray-700 capitalize">{order.order_type}</span>
            <span className="text-xs text-gray-400 ml-auto">{fmtDate(order.created_at)} {fmtTime(order.created_at)}</span>
          </div>

          {order.delivery_address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              {order.delivery_address}
            </div>
          )}

          {/* Items */}
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {order.items?.length > 0
              ? order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity}× {item.name}</span>
                    {item.price && parseFloat(item.price) > 0 && (
                      <span className="text-gray-500">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    )}
                  </div>
                ))
              : <p className="text-sm text-gray-500">{order.items_summary}</p>
            }
            {order.total_amount && (
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>€{order.total_amount}</span>
              </div>
            )}
          </div>

          {order.special_instructions && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500">
              📝 {order.special_instructions}
            </div>
          )}
        </div>

        {/* Contact */}
        {business.phone_number && (
          <a href={`tel:${business.phone_number}`}
             className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors"
             style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Phone className="w-5 h-5 flex-shrink-0" style={{ color: primary }} />
            <div>
              <p className="text-sm font-semibold text-gray-900">Call {business.business_name}</p>
              <p className="text-xs text-gray-500">{business.phone_number}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </a>
        )}

        <p className="text-center text-xs text-gray-300 pb-6">Powered by TechBrain AI</p>
      </div>
    </div>
  );
}
