"use client";

import { useEffect, useState, useCallback } from "react";

interface Order {
  id: string;
  customer_name: string;
  coffee_type: string;
  customer_phone: string;
  delivery_address: string;
  caller_phone: string;
  status: "pending" | "done";
  created_at: string;
}

function getCsrfToken(): string {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf="))
      ?.split("=")[1] ?? ""
  );
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    if (res.ok) {
      setOrders(await res.json());
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const markDone = async (id: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ status: "done" }),
    });
    fetchOrders();
  };

  const pending = orders.filter((o) => o.status === "pending");
  const done = orders.filter((o) => o.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Live Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-refreshes every 10 seconds · Last updated{" "}
            {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading orders...</div>
      ) : (
        <>
          {/* Pending orders */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                No pending orders
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-orange-200 p-4 flex items-start justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 capitalize">
                          {order.coffee_type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {timeAgo(order.created_at)}
                        </span>
                      </div>
                      {order.customer_name && (
                        <p className="text-sm text-gray-800 pl-4 font-medium">{order.customer_name}</p>
                      )}
                      <p className="text-sm text-gray-600 pl-4">{order.delivery_address}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-gray-500 pl-4">{order.customer_phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => markDone(order.id)}
                      className="flex-shrink-0 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Mark Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Done orders */}
          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Completed ({done.length})
              </h2>
              <div className="space-y-2">
                {done.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4 opacity-60"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-500 line-through capitalize">
                          {order.coffee_type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {timeAgo(order.created_at)}
                        </span>
                      </div>
                      {order.customer_name && (
                        <p className="text-sm text-gray-400 pl-4 line-through">{order.customer_name}</p>
                      )}
                      <p className="text-sm text-gray-400 pl-4 line-through">
                        {order.delivery_address}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                      Done
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
