/**
 * POST /api/agent/[businessId]/order
 *
 * Called by the ElevenLabs voice agent as a tool when the customer confirms an order.
 * Accepts a simplified item format (name + quantity, no IDs) since the agent
 * collects items by name from the menu conversation.
 *
 * Returns a human-readable confirmation the agent can read back to the customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  customer_name:        z.string().min(1).max(100),
  // phone: accept customer_phone (portal) or customer_phone from agent
  customer_phone:       z.string().max(30).optional().nullable(),
  caller_id:            z.string().max(100).optional().nullable(), // ElevenLabs system-provided
  order_type:           z.enum(["delivery", "takeaway"]).default("takeaway"),
  // items_text / coffee_type: plain string from voice agent e.g. "2x Espresso (sketo), 1x Croissant"
  items_text:           z.string().max(1000).optional(),
  coffee_type:          z.string().max(1000).optional(), // alias used by Demo Caffe-style agents
  // items array: from portal / direct API calls
  items:                z.array(z.object({
    name:     z.string().min(1),
    quantity: z.number().int().min(1).max(50),
  })).optional(),
  delivery_address:     z.string().max(300).optional().nullable(),
  special_instructions: z.string().max(500).optional().nullable(),
  preferred_language:   z.enum(["el", "en"]).optional().default("el"),
}).transform((d) => ({
  ...d,
  // Normalise: coffee_type is an alias for items_text
  items_text: d.items_text ?? d.coffee_type,
})).refine(
  (d) => (d.items_text && d.items_text.trim().length > 0) || (d.items && d.items.length > 0),
  { message: "Either items_text or items must be provided" }
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

  const supabase = getSupabaseServer();

  // Load business config
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, delivery_enabled, takeaway_enabled, workflow_settings")
    .eq("id", businessId)
    .single();

  if (bErr || !business) {
    return NextResponse.json({ success: false, message: "Business not found" }, { status: 404 });
  }

  const { order_type } = body.data;
  if (order_type === "delivery" && !business.delivery_enabled) {
    return NextResponse.json({ success: false, message: "Delivery is not available for this business" }, { status: 400 });
  }
  if (order_type === "takeaway" && !business.takeaway_enabled) {
    return NextResponse.json({ success: false, message: "Takeaway is not available for this business" }, { status: 400 });
  }
  if (order_type === "delivery" && !body.data.delivery_address) {
    return NextResponse.json({ success: false, message: "Delivery address is required for delivery orders" }, { status: 400 });
  }

  const ws = (business.workflow_settings ?? {}) as Record<string, unknown>;
  const autoAccept = ws.auto_accept_orders === true;
  const initialStatus = autoAccept ? "accepted" : "pending";

  // Normalise items
  // Voice agent sends items_text (plain string); portal sends items[] array
  const rawItems  = body.data.items ?? [];
  const storedItems = rawItems.map((item, i) => ({
    id:       `voice-${Date.now()}-${i}`,
    name:     item.name,
    price:    "",
    quantity: item.quantity,
    notes:    "",
  }));

  const itemsSummary = body.data.items_text?.trim()
    || rawItems.map((i) => `${i.quantity}x ${i.name}`).join(", ");

  const now = new Date();
  let estimatedReadyAt: string | null = null;
  if (autoAccept) {
    const prepMins = Number(ws.avg_prep_time_minutes ?? 20);
    estimatedReadyAt = new Date(now.getTime() + prepMins * 60_000).toISOString();
  }

  // Upsert customer
  let customerId: string | null = null;
  const phone = body.data.customer_phone;
  if (phone) {
    const { data: existing } = await supabase
      .from("business_customers")
      .select("id, total_orders, total_spend")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      await supabase.from("business_customers").update({
        name:              body.data.customer_name,
        preferred_language: body.data.preferred_language,
        total_orders:      existing.total_orders + 1,
        last_seen_at:      now.toISOString(),
      }).eq("id", existing.id);
      customerId = existing.id;
    } else {
      const { data: newC } = await supabase.from("business_customers").insert({
        business_id:       businessId,
        name:              body.data.customer_name,
        phone,
        preferred_language: body.data.preferred_language,
        total_orders:      1,
        last_seen_at:      now.toISOString(),
      }).select("id").single();
      customerId = newC?.id ?? null;
    }
  }

  const { data: order, error: oErr } = await supabase
    .from("business_orders")
    .insert({
      business_id:          businessId,
      customer_name:        body.data.customer_name,
      customer_phone:       phone ?? null,
      customer_id:          customerId,
      preferred_language:   body.data.preferred_language,
      order_type,
      items:                storedItems.length > 0 ? storedItems : [],
      items_summary:        itemsSummary,
      delivery_address:     body.data.delivery_address ?? null,
      special_instructions: body.data.special_instructions ?? null,
      total_amount:         null,
      status:               initialStatus,
      payment_status:       "unpaid",
      ...(autoAccept ? { accepted_at: now.toISOString(), estimated_ready_at: estimatedReadyAt } : {}),
    })
    .select("id")
    .single();

  if (oErr || !order) {
    console.error("[agent/order] DB insert error:", oErr?.message, oErr?.details, oErr?.hint);
    return NextResponse.json({ ok: false, success: false, message: "Failed to save order", debug: oErr?.message }, { status: 500 });
  }

  // Write status history
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status:   initialStatus,
    note:     "Placed via voice agent",
  });

  const ref = order.id.slice(0, 8).toUpperCase();
  const prepMins = Number(ws.avg_prep_time_minutes ?? 20);
  const delivMins = Number(ws.avg_delivery_time_minutes ?? 40);
  const totalMins = order_type === "delivery" ? prepMins + delivMins : prepMins;

  const confirmationEl = order_type === "delivery"
    ? `Παραγγελία καταχωρήθηκε επιτυχώς! Κωδικός: ${ref}. Εκτιμώμενος χρόνος παράδοσης: ${totalMins} λεπτά.`
    : `Παραγγελία καταχωρήθηκε επιτυχώς! Κωδικός: ${ref}. Θα είναι έτοιμη σε ${prepMins} λεπτά.`;

  const confirmationEn = order_type === "delivery"
    ? `Order placed successfully! Reference: ${ref}. Estimated delivery time: ${totalMins} minutes.`
    : `Order placed successfully! Reference: ${ref}. Ready for pickup in ${prepMins} minutes.`;

  // ok=true mirrors the Demo Caffe webhook response so agents checking either field work
  return NextResponse.json({
    ok:         true,
    success:    true,
    order_id:   order.id,
    reference:  ref,
    status:     initialStatus,
    message_el: confirmationEl,
    message_en: confirmationEn,
    message:    confirmationEn,
    estimated_minutes: totalMins,
  }, { status: 201 });
}
