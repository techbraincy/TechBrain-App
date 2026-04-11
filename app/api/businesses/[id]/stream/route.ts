import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";

export const runtime  = "nodejs";
export const maxDuration = 25;

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id: businessId } = await params;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      const supabase = getSupabaseServer();
      const channel = supabase
        .channel(`biz-stream-${businessId}-${Date.now()}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "business_orders",
          filter: `business_id=eq.${businessId}`,
        }, () => {
          if (!closed) {
            try { controller.enqueue(encoder.encode('data: {"type":"orders"}\n\n')); } catch {}
          }
        })
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "business_reservations",
          filter: `business_id=eq.${businessId}`,
        }, () => {
          if (!closed) {
            try { controller.enqueue(encoder.encode('data: {"type":"reservations"}\n\n')); } catch {}
          }
        })
        .subscribe();

      const ping = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(": ping\n\n")); }
          catch { clearInterval(ping); }
        }
      }, 15_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ping);
        supabase.removeChannel(channel);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
