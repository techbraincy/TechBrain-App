/**
 * Supabase query helpers for businesses and elevenlabs_agents tables.
 */
import { getSupabaseServer } from "@/lib/db/supabase-server";
import type {
  Business,
  BusinessInsert,
  BusinessUpdate,
  ElevenLabsAgent,
  AgentInsert,
  AgentUpdate,
  BusinessWithAgent,
} from "@/types/agent";
import {
  DEFAULT_OPENING_HOURS,
  DEFAULT_ESCALATION_RULES,
  DEFAULT_BRANDING,
  DEFAULT_THEME,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_GREETING,
  DEFAULT_WORKFLOW,
  DEFAULT_PERMISSIONS,
  DEFAULT_LANGUAGE_SETTINGS,
} from "@/types/agent";

// ─── Business queries ─────────────────────────────────────────────────────────

export async function getBusinessesByUser(userId: string): Promise<BusinessWithAgent[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("businesses")
    .select(`
      *,
      agent:elevenlabs_agents(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    agent: Array.isArray(row.agent) ? (row.agent[0] ?? null) : (row.agent ?? null),
  })) as BusinessWithAgent[];
}

export async function getAllBusinesses(): Promise<BusinessWithAgent[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("businesses")
    .select(`
      *,
      agent:elevenlabs_agents(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    agent: Array.isArray(row.agent) ? (row.agent[0] ?? null) : (row.agent ?? null),
  })) as BusinessWithAgent[];
}

export async function getBusinessById(id: string, userId?: string): Promise<BusinessWithAgent | null> {
  const supabase = getSupabaseServer();
  let q = supabase
    .from("businesses")
    .select(`
      *,
      agent:elevenlabs_agents(*)
    `)
    .eq("id", id);

  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q.single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message);
  }
  return {
    ...data,
    agent: Array.isArray(data.agent) ? (data.agent[0] ?? null) : (data.agent ?? null),
  } as BusinessWithAgent;
}

export async function createBusiness(input: BusinessInsert): Promise<Business> {
  const supabase = getSupabaseServer();

  // Apply defaults for all JSONB fields
  const insertData = {
    ...input,
    opening_hours:            input.opening_hours            ?? DEFAULT_OPENING_HOURS,
    services:                 input.services                 ?? [],
    menu_catalog:             input.menu_catalog             ?? [],
    faq:                      input.faq                      ?? [],
    escalation_rules:         input.escalation_rules         ?? DEFAULT_ESCALATION_RULES,
    branding_settings:        input.branding_settings        ?? DEFAULT_BRANDING,
    theme_settings:           input.theme_settings           ?? DEFAULT_THEME,
    agent_voice_settings:     input.agent_voice_settings     ?? DEFAULT_VOICE_SETTINGS,
    greeting_settings:        input.greeting_settings        ?? DEFAULT_GREETING,
    workflow_settings:        input.workflow_settings        ?? DEFAULT_WORKFLOW,
    custom_permissions:       input.custom_permissions       ?? DEFAULT_PERMISSIONS,
    holiday_hours:            input.holiday_hours            ?? [],
    languages_supported:      input.languages_supported      ?? ["el", "en"],
    onboarding_complete:      input.onboarding_complete      ?? false,
    onboarding_step:          input.onboarding_step          ?? 1,
  };

  const { data, error } = await supabase
    .from("businesses")
    .insert(insertData)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Business;
}

export async function updateBusiness(
  id: string,
  userId: string,
  updates: BusinessUpdate
): Promise<Business> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Business;
}

export async function deleteBusiness(id: string, userId: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// ─── ElevenLabs agent queries ─────────────────────────────────────────────────

export async function getAgentByBusinessId(businessId: string): Promise<ElevenLabsAgent | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("elevenlabs_agents")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as ElevenLabsAgent;
}

export async function upsertAgent(input: AgentInsert): Promise<ElevenLabsAgent> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("elevenlabs_agents")
    .upsert(
      {
        ...input,
        language_settings: input.language_settings ?? DEFAULT_LANGUAGE_SETTINGS,
        capabilities:      input.capabilities ?? {},
      },
      { onConflict: "business_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ElevenLabsAgent;
}

export async function updateAgent(
  businessId: string,
  updates: AgentUpdate
): Promise<ElevenLabsAgent> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("elevenlabs_agents")
    .update(updates)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ElevenLabsAgent;
}

export async function setAgentStatus(
  businessId: string,
  status: ElevenLabsAgent["status"],
  extra?: { elevenlabs_agent_id?: string; error_message?: string; last_synced_at?: string; system_prompt?: string }
): Promise<void> {
  const supabase = getSupabaseServer();
  const updates: Record<string, unknown> = { status, error_message: null };
  if (extra?.elevenlabs_agent_id) updates.elevenlabs_agent_id = extra.elevenlabs_agent_id;
  if (extra?.error_message)       updates.error_message       = extra.error_message;
  if (extra?.last_synced_at)      updates.last_synced_at      = extra.last_synced_at;
  if (extra?.system_prompt)       updates.system_prompt       = extra.system_prompt;

  const { error } = await supabase
    .from("elevenlabs_agents")
    .update(updates)
    .eq("business_id", businessId);

  if (error) throw new Error(error.message);
}
