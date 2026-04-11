import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getBusinessesByUser, createBusiness } from "@/lib/db/queries/businesses";
import { upsertAgent } from "@/lib/db/queries/businesses";
import type { BusinessCategory } from "@/types/agent";

const createSchema = z.object({
  business_name:     z.string().min(1).max(120),
  business_category: z.string().min(1) as z.ZodType<BusinessCategory>,
  phone_number:      z.string().max(30).optional().default(""),
  address:           z.string().max(300).optional().default(""),
  google_maps_link:  z.string().url().optional().or(z.literal("")).default(""),
});

export async function GET() {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const businesses = await getBusinessesByUser(userId);
    return NextResponse.json(businesses);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  try {
    const business = await createBusiness({
      user_id:           userId,
      business_name:     body.data.business_name,
      business_category: body.data.business_category,
      phone_number:      body.data.phone_number || null,
      address:           body.data.address || null,
      google_maps_link:  body.data.google_maps_link || null,
      opening_hours:     {},
      languages_supported: ["el", "en"],
      services:          [],
      menu_catalog:      [],
      faq:               [],
      reservation_enabled:  false,
      meetings_enabled:     false,
      delivery_enabled:     false,
      takeaway_enabled:     false,
      custom_agent_instructions: null,
      escalation_rules:  {} as never,
      branding_settings: {} as never,
      theme_settings:    {} as never,
      agent_voice_settings: {} as never,
      greeting_settings:    {} as never,
      workflow_settings:    {} as never,
      custom_permissions:   {} as never,
      service_area:      null,
      holiday_hours:     [],
      onboarding_complete: false,
      onboarding_step:   1,
    });

    // Create the agent record immediately (status=pending)
    await upsertAgent({
      business_id:         business.id,
      elevenlabs_agent_id: null,
      agent_name:          `${business.business_name} Assistant`,
      voice_id:            null,
      voice_name:          null,
      system_prompt:       null,
      language_settings:   {} as never,
      personality:         "professional",
      tone:                "helpful",
      capabilities:        {},
      status:              "pending",
      last_synced_at:      null,
      error_message:       null,
    });

    return NextResponse.json(business, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
