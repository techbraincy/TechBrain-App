/**
 * POST /api/agent/[businessId]/reservation
 *
 * Called by the ElevenLabs voice agent as a tool when the customer confirms a reservation.
 * Returns a human-readable confirmation the agent can read back to the customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  customer_name:      z.string().min(1).max(100),
  customer_phone:     z.string().max(30).optional().nullable(),
  reservation_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  reservation_time:   z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM"),
  party_size:         z.number().int().min(1).max(100).default(2),
  notes:              z.string().max(500).optional().nullable(),
  preferred_language: z.enum(["el", "en"]).optional().default("el"),
});

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
  if (body.data.reservation_date < today) {
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
  const maxParty = Number(ws.max_party_size ?? 10);
  if (body.data.party_size > maxParty) {
    return NextResponse.json({
      success: false,
      message: `Maximum party size is ${maxParty}. Please call us for larger groups.`,
    }, { status: 400 });
  }

  const now = new Date();
  const phone = body.data.customer_phone;

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
      reservation_date:   body.data.reservation_date,
      reservation_time:   body.data.reservation_time.slice(0, 5), // HH:MM
      party_size:         body.data.party_size,
      notes:              body.data.notes ?? null,
      status:             "pending",
    })
    .select("id")
    .single();

  if (rErr || !reservation) {
    return NextResponse.json({ success: false, message: "Failed to save reservation" }, { status: 500 });
  }

  const ref  = reservation.id.slice(0, 8).toUpperCase();
  const date = new Date(`${body.data.reservation_date}T${body.data.reservation_time}`);
  const dateStrEl = date.toLocaleDateString("el", { weekday: "long", day: "numeric", month: "long" });
  const dateStrEn = date.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
  const time = body.data.reservation_time.slice(0, 5);

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
