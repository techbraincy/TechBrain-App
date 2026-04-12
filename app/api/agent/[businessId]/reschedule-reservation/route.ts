/**
 * POST /api/agent/[businessId]/reschedule-reservation
 *
 * Reschedules an existing reservation to a new date and time.
 * Looks up the reservation by phone number + old date,
 * then checks availability for the new slot before moving it.
 *
 * Returns success (bool) and new booking details or a reason if it failed.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  phone_number: z.string().min(1).max(30),
  old_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "old_date must be YYYY-MM-DD"),
  new_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "new_date must be YYYY-MM-DD"),
  new_time:     z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "new_time must be HH:MM"),
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

  const { phone_number, old_date, new_date, new_time } = parsed.data;
  const newTimeShort = new_time.slice(0, 5);
  const supabase = getSupabaseServer();

  // Find the existing reservation
  const { data: reservation, error: fErr } = await supabase
    .from("business_reservations")
    .select("id, party_size, customer_name, status")
    .eq("business_id", businessId)
    .eq("customer_phone", phone_number)
    .eq("reservation_date", old_date)
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
      reason:  `No active reservation found for ${phone_number} on ${old_date}. The booking may not exist or the details may not match.`,
    });
  }

  // Check availability for the new slot (±30 min window)
  const ws = await supabase
    .from("businesses")
    .select("workflow_settings")
    .eq("id", businessId)
    .single()
    .then((r) => (r.data?.workflow_settings ?? {}) as Record<string, unknown>);

  const maxCoversPerSlot = Number(ws.max_covers_per_slot ?? 50);
  const [hh, mm] = newTimeShort.split(":").map(Number);
  const slotMins = hh * 60 + mm;
  const toHHMM = (m: number) => `${String(Math.floor(Math.abs(m) / 60) % 24).padStart(2, "0")}:${String(Math.abs(m) % 60).padStart(2, "0")}`;

  const { data: existing } = await supabase
    .from("business_reservations")
    .select("party_size")
    .eq("business_id", businessId)
    .eq("reservation_date", new_date)
    .in("status", ["pending", "confirmed"])
    .neq("id", reservation.id) // exclude current reservation
    .gte("reservation_time", toHHMM(slotMins - 30))
    .lte("reservation_time", toHHMM(slotMins + 30));

  const bookedCovers = (existing ?? []).reduce((sum, r) => sum + (r.party_size ?? 0), 0);
  if (bookedCovers + reservation.party_size > maxCoversPerSlot) {
    return NextResponse.json({
      success: false,
      reason:  `Unfortunately ${new_date} at ${newTimeShort} is fully booked. Would you like to try a different time?`,
    });
  }

  // Move the reservation
  const { error: uErr } = await supabase
    .from("business_reservations")
    .update({
      reservation_date: new_date,
      reservation_time: newTimeShort,
      status:           "confirmed",
      updated_at:       new Date().toISOString(),
    })
    .eq("id", reservation.id);

  if (uErr) {
    return NextResponse.json({ success: false, reason: "Failed to reschedule the reservation. Please try again." }, { status: 500 });
  }

  void supabase.from("order_status_history").insert({
    order_id: reservation.id,
    status:   "confirmed",
    note:     `Rescheduled via voice agent to ${new_date} at ${newTimeShort}`,
  });

  return NextResponse.json({
    success:        true,
    reservation_id: reservation.id,
    customer_name:  reservation.customer_name,
    new_date,
    new_time:       newTimeShort,
    party_size:     reservation.party_size,
    message:        `Your reservation for ${reservation.party_size} has been rescheduled to ${new_date} at ${newTimeShort}.`,
    message_el:     `Η κράτησή σας για ${reservation.party_size} άτομα μεταφέρθηκε στις ${new_date} στις ${newTimeShort}.`,
  });
}
