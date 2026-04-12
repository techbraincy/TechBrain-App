/**
 * GET /api/businesses/[id]/agent/tools-preview
 *
 * Returns the tool definitions that would be sent to ElevenLabs for this business.
 * Used to verify the tool config is correct before syncing.
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getBusinessById } from "@/lib/db/queries/businesses";
import { buildTools } from "@/lib/elevenlabs/agent-builder";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role   = h.get("x-user-role") ?? "user";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const business = await getBusinessById(id, role === "superadmin" ? undefined : userId);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tools = buildTools(business);
  const appUrl = process.env.APP_URL ?? process.env.VERCEL_URL ?? "NOT SET";

  return NextResponse.json({
    app_url:    appUrl,
    tool_count: tools.length,
    tools,
  });
}
