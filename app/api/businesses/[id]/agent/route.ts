import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getBusinessById, getAgentByBusinessId, updateAgent } from "@/lib/db/queries/businesses";

const updateSchema = z.object({
  agent_name:        z.string().min(1).max(100).optional(),
  voice_id:          z.string().optional().nullable(),
  voice_name:        z.string().optional().nullable(),
  personality:       z.enum(["professional","friendly","formal","casual","energetic","calm"]).optional(),
  tone:              z.enum(["helpful","assertive","empathetic","concise","detailed"]).optional(),
  language_settings: z.record(z.unknown()).optional(),
  capabilities:      z.record(z.boolean()).optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify ownership
    const business = await getBusinessById(id, userId);
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const agent = await getAgentByBusinessId(id);
    return NextResponse.json(agent ?? { status: "pending", business_id: id });
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
    const business = await getBusinessById(id, userId);
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const agent = await updateAgent(id, body.data as never);
    return NextResponse.json(agent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
