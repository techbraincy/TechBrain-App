import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  customer_name:        z.string().min(1).max(100),
  customer_phone:       z.string().max(30).nullable().optional(),
  customer_email:       z.string().email().nullable().optional(),
  preferred_language:   z.enum(["el", "en"]).optional().default("el"),
  order_type:           z.enum(["delivery", "takeaway"]).default("takeaway"),
  items:                z.array(z.object({
    id:       z.string(),
    name:     z.string(),
    price:    z.string().optional().default(""),
    quantity: z.number().int().min(1).max(50),
    notes:    z.string().optional().default(""),
  })).min(1),
  items_summary:        z.string().max(500).optional(),
  delivery_address:     z.string().max(300).nullable().optional(),
  special_instructions: z.string().max(500).nullable().optional(),
  total_amount:         z.string().nullable().optional(),
});

type Params = { params: Promise<{ businessId: string }> };

async function upsertCustomer(
  supabase: ReturnType<typeof import("@/lib/db/supabase-server").getSupabaseServer>,
  businessId: string,
  name: string,
  phone: string | null | undefined,
  email: string | null | undefined,
  language: string,
  spend: number,
): Promise<string | null> {
  if (!phone && !email) return null;

  // Try to find existing customer by phone
  let customerId: string | null = null;

  if (phone) {
    const { data: existing } = await supabase
      .from("business_customers")
      .select("id, total_orders, total_spend")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("business_customers")
        .update({
          name,
          email: email ?? undefined,
          preferred_language: language,
          total_orders: existing.total_orders + 1,
          total_spend:  Number(existing.total_spend) + spend,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      customerId = existing.id;
    }
  }

  if (!customerId) {
    const { data: newCustomer } = await supabase
      .from("business_customers")
      .insert({
        business_id:       businessId,
        name,
        phone:             phone ?? null,
        email:             email ?? null,
        preferred_language: language,
        total_orders:      1,
        total_spend:       spend,
        last_seen_at:      new Date().toISOString(),
      })
      .select("id")
      .single();
    customerId = newCustomer?.id ?? null;
  }

  return customerId;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { businessId } = await params;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // Verify business exists and has ordering enabled
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, delivery_enabled, takeaway_enabled, workflow_settings")
    .eq("id", businessId)
    .single();

  if (bErr || !business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { order_type } = body.data;
  if (order_type === "delivery" && !business.delivery_enabled) {
    return NextResponse.json({ error: "Delivery not available" }, { status: 400 });
  }
  if (order_type === "takeaway" && !business.takeaway_enabled) {
    return NextResponse.json({ error: "Takeaway not available" }, { status: 400 });
  }

  const ws = (business.workflow_settings ?? {}) as Record<string, unknown>;
  const autoAccept = ws.auto_accept_orders === true;
  const initialStatus = autoAccept ? "accepted" : "pending";

  const spend = body.data.total_amount ? parseFloat(body.data.total_amount) : 0;

  // Upsert customer record
  const customerId = await upsertCustomer(
    supabase,
    businessId,
    body.data.customer_name,
    body.data.customer_phone,
    body.data.customer_email,
    body.data.preferred_language,
    spend,
  );

  // Compute estimated times if auto-accept
  const now = new Date();
  let estimatedReadyAt: string | null = null;
  if (autoAccept) {
    const prepMins = Number(ws.avg_prep_time_minutes ?? 20);
    estimatedReadyAt = new Date(now.getTime() + prepMins * 60_000).toISOString();
  }

  const { data, error } = await supabase
    .from("business_orders")
    .insert({
      business_id:          businessId,
      customer_name:        body.data.customer_name,
      customer_phone:       body.data.customer_phone ?? null,
      email:                body.data.customer_email ?? null,
      customer_id:          customerId,
      preferred_language:   body.data.preferred_language,
      order_type,
      items:                body.data.items,
      items_summary:        body.data.items_summary ?? null,
      delivery_address:     body.data.delivery_address ?? null,
      special_instructions: body.data.special_instructions ?? null,
      total_amount:         body.data.total_amount ?? null,
      status:               initialStatus,
      payment_status:       "unpaid",
      ...(autoAccept ? { accepted_at: now.toISOString(), estimated_ready_at: estimatedReadyAt } : {}),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write initial status history entry
  await supabase.from("order_status_history").insert({
    order_id: data.id,
    status:   initialStatus,
    note:     autoAccept ? "Auto-accepted by system" : "Order placed by customer",
  });

  return NextResponse.json({
    id: data.id,
    status: initialStatus,
    estimated_ready_at: estimatedReadyAt,
  }, { status: 201 });
}
