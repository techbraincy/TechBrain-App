import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  customer_name:        z.string().min(1).max(100),
  customer_phone:       z.string().max(30).nullable().optional(),
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
    .select("id, delivery_enabled, takeaway_enabled")
    .eq("id", businessId)
    .single();

  if (bErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { order_type } = body.data;
  if (order_type === "delivery" && !business.delivery_enabled) {
    return NextResponse.json({ error: "Delivery not available" }, { status: 400 });
  }
  if (order_type === "takeaway" && !business.takeaway_enabled) {
    return NextResponse.json({ error: "Takeaway not available" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("business_orders")
    .insert({
      business_id:          businessId,
      customer_name:        body.data.customer_name,
      customer_phone:       body.data.customer_phone ?? null,
      order_type:           body.data.order_type,
      items:                body.data.items,
      items_summary:        body.data.items_summary ?? null,
      delivery_address:     body.data.delivery_address ?? null,
      special_instructions: body.data.special_instructions ?? null,
      total_amount:         body.data.total_amount ?? null,
      status:               "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
