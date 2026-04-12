import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { validateCsrf } from "@/lib/auth/csrf";
import { z } from "zod";

const ORDER_STATUSES = ["pending", "accepted", "rejected", "preparing", "ready", "out_for_delivery", "completed", "cancelled"] as const;

const schema = z.object({
  status:              z.enum(ORDER_STATUSES).optional(),
  staff_notes:         z.string().optional(),
  estimated_ready_at:  z.string().datetime({ offset: true }).optional().nullable(),
  note:                z.string().optional(), // status history note
});

// Timestamps to set per status transition
const STATUS_TIMESTAMPS: Record<string, string> = {
  accepted:  "accepted_at",
  rejected:  "rejected_at",
  completed: "completed_at",
};

type Params = { params: Promise<{ id: string; orderId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role   = h.get("x-user-role") ?? "user";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  const { id: businessId, orderId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const supabase = getSupabaseServer();

  if (role !== "superadmin") {
    const { data: biz } = await supabase
      .from("businesses").select("user_id").eq("id", businessId).single();
    if (!biz || biz.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = {};

  if (body.data.status !== undefined) {
    updates.status = body.data.status;
    const tsCol = STATUS_TIMESTAMPS[body.data.status];
    if (tsCol) updates[tsCol] = new Date().toISOString();
  }
  if (body.data.staff_notes !== undefined) updates.staff_notes = body.data.staff_notes;
  if ("estimated_ready_at" in body.data) updates.estimated_ready_at = body.data.estimated_ready_at;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("business_orders")
    .update(updates)
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write status history entry
  if (body.data.status) {
    await supabase.from("order_status_history").insert({
      order_id:   orderId,
      status:     body.data.status,
      note:       body.data.note ?? null,
      created_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
