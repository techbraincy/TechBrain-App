import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getBusinessById, updateBusiness, deleteBusiness } from "@/lib/db/queries/businesses";

const updateSchema = z.object({
  business_name:             z.string().min(1).max(120).optional(),
  business_category:         z.string().optional(),
  phone_number:              z.string().max(30).optional().nullable(),
  address:                   z.string().max(400).optional().nullable(),
  google_maps_link:          z.string().optional().nullable(),
  opening_hours:             z.record(z.unknown()).optional(),
  languages_supported:       z.array(z.string()).optional(),
  services:                  z.array(z.unknown()).optional(),
  menu_catalog:              z.array(z.unknown()).optional(),
  faq:                       z.array(z.unknown()).optional(),
  reservation_enabled:       z.boolean().optional(),
  meetings_enabled:          z.boolean().optional(),
  delivery_enabled:          z.boolean().optional(),
  takeaway_enabled:          z.boolean().optional(),
  custom_agent_instructions: z.string().optional().nullable(),
  escalation_rules:          z.record(z.unknown()).optional(),
  branding_settings:         z.record(z.unknown()).optional(),
  theme_settings:            z.record(z.unknown()).optional(),
  agent_voice_settings:      z.record(z.unknown()).optional(),
  greeting_settings:         z.record(z.unknown()).optional(),
  workflow_settings:         z.record(z.unknown()).optional(),
  custom_permissions:        z.record(z.unknown()).optional(),
  service_area:              z.string().optional().nullable(),
  holiday_hours:             z.array(z.unknown()).optional(),
  onboarding_complete:       z.boolean().optional(),
  onboarding_step:           z.number().int().min(1).max(10).optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = h.get("x-user-role");

  try {
    // Superadmin can see all; regular users only their own
    const business = await getBusinessById(id, role === "superadmin" ? undefined : userId);
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(business);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  try {
    const updated = await updateBusiness(id, userId, body.data as never);
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await deleteBusiness(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
