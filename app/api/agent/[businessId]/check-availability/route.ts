/**
 * POST /api/agent/[businessId]/check-availability
 *
 * Checks whether a table/slot is available for a given date, time, and party size.
 * Called by the voice agent before asking the customer to confirm a booking.
 *
 * Availability logic:
 *  - Counts total guests already booked in pending/confirmed reservations
 *    within ±30 minutes of the requested time on the same date.
 *  - Compares against max_covers_per_slot from workflow_settings (default 50).
 *  - Also respects max_party_size setting.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time:       z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM"),
  party_size: z.number().int().min(1).max(100),
});

type Params = { params: Promise<{ businessId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { businessId } = await params;

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return NextResponse.json({ available: false, reason: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { available: false, reason: parsed.error.issues[0]?.message ?? "Invalid parameters" },
      { status: 400 }
    );
  }

  const { date, time, party_size } = parsed.data;
  const timeShort = time.slice(0, 5); // "HH:MM"

  const supabase = getSupabaseServer();

  // Load business config
  const { data: biz, error: bErr } = await supabase
    .from("businesses")
    .select("id, reservation_enabled, workflow_settings")
    .eq("id", businessId)
    .single();

  if (bErr || !biz) {
    return NextResponse.json({ available: false, reason: "Business not found" }, { status: 404 });
  }

  if (!biz.reservation_enabled) {
    return NextResponse.json({ available: false, reason: "Reservations are not available for this business" });
  }

  const ws = (biz.workflow_settings ?? {}) as Record<string, unknown>;
  const maxCoversPerSlot = Number(ws.max_covers_per_slot ?? 50);
  const maxPartySize     = Number(ws.max_party_size ?? 20);

  // Check party size limit
  if (party_size > maxPartySize) {
    return NextResponse.json({
      available: false,
      reason: `We can only accommodate up to ${maxPartySize} guests per booking. For larger groups, please contact us directly.`,
    });
  }

  // Build a ±30 minute window around the requested time to detect overlapping reservations
  const [hh, mm] = timeShort.split(":").map(Number);
  const slotMins = hh * 60 + mm;
  const windowStart = slotMins - 30;
  const windowEnd   = slotMins + 30;

  const toHHMM = (mins: number) => {
    const h = Math.floor(Math.abs(mins) / 60) % 24;
    const m = Math.abs(mins) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Fetch reservations on the same date that overlap the slot window
  const { data: existing, error: rErr } = await supabase
    .from("business_reservations")
    .select("party_size, reservation_time")
    .eq("business_id", businessId)
    .eq("reservation_date", date)
    .in("status", ["pending", "confirmed"])
    .gte("reservation_time", toHHMM(windowStart))
    .lte("reservation_time", toHHMM(windowEnd));

  if (rErr) {
    // Don't block the agent on DB errors — allow and let staff sort it out
    return NextResponse.json({
      available: true,
      message:   `The slot at ${timeShort} on ${date} appears available for ${party_size} guests.`,
    });
  }

  const bookedCovers = (existing ?? []).reduce((sum, r) => sum + (r.party_size ?? 0), 0);
  const remainingCovers = maxCoversPerSlot - bookedCovers;

  if (remainingCovers < party_size) {
    return NextResponse.json({
      available: false,
      reason: `Unfortunately we're fully booked around ${timeShort} on ${date}. Would you like to try a different time?`,
    });
  }

  return NextResponse.json({
    available: true,
    message:   `The slot at ${timeShort} on ${date} is available for ${party_size} guests.`,
  });
}
