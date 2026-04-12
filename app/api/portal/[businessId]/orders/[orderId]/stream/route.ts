import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";

export const runtime     = "nodejs";
export const maxDuration = 25;

type Params = { params: Promise<{ businessId: string; orderId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { businessId, orderId } = await params;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      const supabase = getSupabaseServer();
      const channel = supabase
        .channel(`order-track-${orderId}-${Date.now()}`)
        .on("postgres_changes", {
          event:  "UPDATE",
          schema: "public",
          table:  "business_orders",
          filter: `id=eq.${orderId}`,
        }, (payload) => {
          if (!closed && payload.new?.business_id === businessId) {
            try {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "status", status: payload.new.status, estimated_ready_at: payload.new.estimated_ready_at })}\n\n`
              ));
            } catch {}
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
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
