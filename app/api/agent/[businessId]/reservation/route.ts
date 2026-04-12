/**
 * POST /api/agent/[businessId]/reservation
 *
 * Called by the ElevenLabs voice agent as a tool when the customer confirms a reservation.
 * Returns a human-readable confirmation the agent can read back to the customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

// Accepts both field-name conventions:
//   Agent:  phone_number, date, time  (matches Restaurant Receptionist v2 schema)
//   Portal: customer_phone, reservation_date, reservation_time
const schema = z.object({
  customer_name:      z.string().min(1).max(100),
  // phone: accept either phone_number (agent) or customer_phone (portal)
  phone_number:       z.string().max(30).optional().nullable(),
  customer_phone:     z.string().max(30).optional().nullable(),
  // date: accept either date (agent) or reservation_date (portal)
  date:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reservation_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // time: accept either time (agent) or reservation_time (portal)
  time:               z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  reservation_time:   z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  party_size:         z.number().int().min(1).max(100).default(2),
  notes:              z.string().max(500).optional().nullable(),
  preferred_language: z.enum(["el", "en"]).optional().default("el"),
}).transform((d) => ({
  ...d,
  // Normalise to canonical names
  resolved_phone: d.phone_number ?? d.customer_phone ?? null,
  resolved_date:  (d.date ?? d.reservation_date ?? ""),
  resolved_time:  (d.time ?? d.reservation_time ?? ""),
})).refine(
  (d) => /^\d{4}-\d{2}-\d{2}$/.test(d.resolved_date),
  { message: "date must be YYYY-MM-DD" }
).refine(
  (d) => /^\d{2}:\d{2}/.test(d.resolved_time),
  { message: "time must be HH:MM" }
);

type Params = { params: Promise<{ businessId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { businessId } = await params;

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const body = schema.safeParse(rawBody);
  if (!body.success) {
    const msg = body.error.issues[0]?.message ?? "Invalid parameters";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (body.data.resolved_date < today) {
    return NextResponse.json({
      success: false,
      message: "Reservation date cannot be in the past",
    }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, reservation_enabled, meetings_enabled, workflow_settings")
    .eq("id", businessId)
    .single();

  if (bErr || !business) {
    return NextResponse.json({ success: false, message: "Business not found" }, { status: 404 });
  }
  if (!business.reservation_enabled && !business.meetings_enabled) {
    return NextResponse.json({ success: false, message: "Reservations are not available" }, { status: 400 });
  }

  const ws = (business.workflow_settings ?? {}) as Record<string, unknown>;
  const maxParty = Number(ws.max_party_size ?? 20);
  if (body.data.party_size > maxParty) {
    return NextResponse.json({
      success: false,
      message: `Maximum party size is ${maxParty}. Please call us for larger groups.`,
    }, { status: 400 });
  }

  const now = new Date();
  const phone = body.data.resolved_phone;

  // Upsert customer
  let customerId: string | null = null;
  if (phone) {
    const { data: existing } = await supabase
      .from("business_customers")
      .select("id, total_reservations")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      await supabase.from("business_customers").update({
        name:               body.data.customer_name,
        preferred_language: body.data.preferred_language,
        total_reservations: existing.total_reservations + 1,
        last_seen_at:       now.toISOString(),
      }).eq("id", existing.id);
      customerId = existing.id;
    } else {
      const { data: newC } = await supabase.from("business_customers").insert({
        business_id:       businessId,
        name:              body.data.customer_name,
        phone,
        preferred_language: body.data.preferred_language,
        total_reservations: 1,
        last_seen_at:      now.toISOString(),
      }).select("id").single();
      customerId = newC?.id ?? null;
    }
  }

  const { data: reservation, error: rErr } = await supabase
    .from("business_reservations")
    .insert({
      business_id:        businessId,
      customer_name:      body.data.customer_name,
      customer_phone:     phone ?? null,
      customer_id:        customerId,
      preferred_language: body.data.preferred_language,
      reservation_date:   body.data.resolved_date,
      reservation_time:   body.data.resolved_time.slice(0, 5), // HH:MM
      party_size:         body.data.party_size,
      notes:              body.data.notes ?? null,
      status:             "pending",
    })
    .select("id")
    .single();

  if (rErr || !reservation) {
    console.error("[agent/reservation] DB insert error:", rErr?.message, rErr?.details, rErr?.hint);
    return NextResponse.json({ success: false, message: "Failed to save reservation", debug: rErr?.message }, { status: 500 });
  }

  const ref  = reservation.id.slice(0, 8).toUpperCase();
  const dateObj = new Date(`${body.data.resolved_date}T${body.data.resolved_time}`);
  const dateStrEl = dateObj.toLocaleDateString("el", { weekday: "long", day: "numeric", month: "long" });
  const dateStrEn = dateObj.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
  const time = body.data.resolved_time.slice(0, 5);

  return NextResponse.json({
    success:         true,
    reservation_id:  reservation.id,
    reference:       ref,
    status:          "pending",
    message_el: `Κράτηση καταχωρήθηκε επιτυχώς! Κωδικός: ${ref}. ${dateStrEl} στις ${time} για ${body.data.party_size} άτομα. Θα λάβετε επιβεβαίωση σύντομα.`,
    message_en: `Reservation received! Reference: ${ref}. ${dateStrEn} at ${time} for ${body.data.party_size} ${body.data.party_size === 1 ? "person" : "people"}. We'll confirm shortly.`,
    message:    `Reservation received! Reference: ${ref}. ${dateStrEn} at ${time} for ${body.data.party_size} ${body.data.party_size === 1 ? "person" : "people"}. We'll confirm shortly.`,
  }, { status: 201 });
}
