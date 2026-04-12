import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  customer_name:      z.string().min(1).max(100),
  customer_phone:     z.string().max(30).nullable().optional(),
  customer_email:     z.string().email().nullable().optional(),
  preferred_language: z.enum(["el", "en"]).optional().default("el"),
  reservation_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time:   z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  party_size:         z.number().int().min(1).max(100).default(2),
  notes:              z.string().max(500).nullable().optional(),
});

type Params = { params: Promise<{ businessId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { businessId } = await params;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (body.data.reservation_date < today) {
    return NextResponse.json({ error: "Reservation date cannot be in the past" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, reservation_enabled, meetings_enabled")
    .eq("id", businessId)
    .single();

  if (bErr || !business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!business.reservation_enabled && !business.meetings_enabled) {
    return NextResponse.json({ error: "Reservations not available" }, { status: 400 });
  }

  // Upsert customer
  let customerId: string | null = null;
  const phone = body.data.customer_phone;
  if (phone) {
    const { data: existing } = await supabase
      .from("business_customers")
      .select("id, total_reservations")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      await supabase.from("business_customers").update({
        name: body.data.customer_name,
        email: body.data.customer_email ?? undefined,
        preferred_language: body.data.preferred_language,
        total_reservations: existing.total_reservations + 1,
        last_seen_at: new Date().toISOString(),
      }).eq("id", existing.id);
      customerId = existing.id;
    } else {
      const { data: newC } = await supabase.from("business_customers").insert({
        business_id:       businessId,
        name:              body.data.customer_name,
        phone,
        email:             body.data.customer_email ?? null,
        preferred_language: body.data.preferred_language,
        total_reservations: 1,
        last_seen_at:      new Date().toISOString(),
      }).select("id").single();
      customerId = newC?.id ?? null;
    }
  }

  const { data, error } = await supabase
    .from("business_reservations")
    .insert({
      business_id:       businessId,
      customer_name:     body.data.customer_name,
      customer_phone:    body.data.customer_phone ?? null,
      email:             body.data.customer_email ?? null,
      customer_id:       customerId,
      preferred_language: body.data.preferred_language,
      reservation_date:  body.data.reservation_date,
      reservation_time:  body.data.reservation_time,
      party_size:        body.data.party_size,
      notes:             body.data.notes ?? null,
      status:            "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, status: "pending" }, { status: 201 });
}
