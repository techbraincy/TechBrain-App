/**
 * POST /api/agent/[businessId]/cancel-reservation
 *
 * Cancels an existing reservation identified by the customer's phone number and date.
 * Called by the voice agent when a customer asks to cancel a booking.
 *
 * Returns success (bool) and a human-readable reason if the cancellation fails.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  phone_number: z.string().min(1).max(30),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

type Params = { params: Promise<{ businessId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { businessId } = await params;

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return NextResponse.json({ success: false, reason: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, reason: parsed.error.issues[0]?.message ?? "Invalid parameters" },
      { status: 400 }
    );
  }

  const { phone_number, date } = parsed.data;
  const supabase = getSupabaseServer();

  // Find the reservation
  const { data: reservation, error: fErr } = await supabase
    .from("business_reservations")
    .select("id, status, reservation_time, party_size, customer_name")
    .eq("business_id", businessId)
    .eq("customer_phone", phone_number)
    .eq("reservation_date", date)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fErr) {
    return NextResponse.json({ success: false, reason: "Could not look up the reservation. Please try again." }, { status: 500 });
  }

  if (!reservation) {
    return NextResponse.json({
      success: false,
      reason:  `No active reservation found for ${phone_number} on ${date}. The booking may have already been cancelled or the details may not match.`,
    });
  }

  // Cancel it
  const { error: uErr } = await supabase
    .from("business_reservations")
    .update({
      status:              "cancelled",
      cancellation_reason: "Cancelled by customer via voice agent",
      updated_at:          new Date().toISOString(),
    })
    .eq("id", reservation.id);

  if (uErr) {
    return NextResponse.json({ success: false, reason: "Failed to cancel the reservation. Please try again." }, { status: 500 });
  }

  // Write status history (non-blocking)
  void supabase.from("order_status_history").insert({
    order_id: reservation.id,
    status:   "cancelled",
    note:     "Cancelled via voice agent",
  });

  return NextResponse.json({
    success:          true,
    reservation_id:   reservation.id,
    customer_name:    reservation.customer_name,
    date,
    time:             reservation.reservation_time,
    message:          `Your reservation for ${reservation.party_size} on ${date} at ${reservation.reservation_time} has been successfully cancelled.`,
    message_el:       `Η κράτησή σας για ${reservation.party_size} άτομα στις ${date} στις ${reservation.reservation_time} ακυρώθηκε επιτυχώς.`,
  });
}
