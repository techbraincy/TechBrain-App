/**
 * POST /api/businesses/[id]/agent/sync
 *
 * Creates or updates the ElevenLabs agent for this business.
 * This is the main integration endpoint — it reads the business config,
 * builds the agent payload, and calls ElevenLabs to create/update.
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getBusinessById, getAgentByBusinessId, upsertAgent, setAgentStatus } from "@/lib/db/queries/businesses";
import { createAgent, updateAgent as elUpdateAgent } from "@/lib/elevenlabs/client";
import { buildAgentConfig } from "@/lib/elevenlabs/agent-builder";
import type { ElevenLabsAgent } from "@/types/agent";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // 1. Fetch the business (with ownership check)
    const business = await getBusinessById(id, userId);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // 2. Get or create agent record in DB
    let agent = await getAgentByBusinessId(id);
    if (!agent) {
      agent = await upsertAgent({
        business_id:         id,
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
    }

    // 3. Mark as creating
    await setAgentStatus(id, "creating");

    // 4. Build the agent config from business data
    const config = buildAgentConfig(business, agent as Partial<ElevenLabsAgent>);

    let elAgentId = agent.elevenlabs_agent_id;

    try {
      if (elAgentId) {
        // Update existing ElevenLabs agent
        await elUpdateAgent(elAgentId, config);
      } else {
        // Create new ElevenLabs agent
        const created = await createAgent(config);
        elAgentId = created.agent_id;
      }
    } catch (elError) {
      const msg = elError instanceof Error ? elError.message : "ElevenLabs error";
      await setAgentStatus(id, "error", { error_message: msg });
      return NextResponse.json({ error: `ElevenLabs error: ${msg}` }, { status: 502 });
    }

    // 5. Persist the ElevenLabs agent ID and mark active
    await setAgentStatus(id, "active", {
      elevenlabs_agent_id: elAgentId!,
      last_synced_at:      new Date().toISOString(),
      system_prompt:       config.conversation_config.agent.prompt.prompt,
    });

    // 6. Also mark onboarding complete if not already
    if (!business.onboarding_complete) {
      const supabase = (await import("@/lib/db/supabase-server")).getSupabaseServer();
      await supabase
        .from("businesses")
        .update({ onboarding_complete: true })
        .eq("id", id);
    }

    // 7. Return success with the ElevenLabs agent ID
    const updatedAgent = await getAgentByBusinessId(id);
    return NextResponse.json({
      success:             true,
      elevenlabs_agent_id: elAgentId,
      agent:               updatedAgent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await setAgentStatus(id, "error", { error_message: msg }).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
