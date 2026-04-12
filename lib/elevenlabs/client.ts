/**
 * ElevenLabs Conversational AI API client.
 * Server-side only — never import in Client Components.
 *
 * Docs: https://elevenlabs.io/docs/conversational-ai/api-reference
 */

const BASE_URL = "https://api.elevenlabs.io";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing required environment variable: ELEVENLABS_API_KEY");
  return key;
}

async function elevenlabsFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "xi-api-key":   getApiKey(),
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `ElevenLabs API error ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail?.message ?? body?.detail ?? body?.message ?? message;
    } catch { /* ignore parse error */ }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─── Types mirroring ElevenLabs API ──────────────────────────────────────────

export interface ELVoice {
  voice_id:    string;
  name:        string;
  category:    string;
  description: string | null;
  preview_url: string | null;
  labels:      Record<string, string>;
}

export interface ELAgentConfig {
  name: string;
  conversation_config: {
    asr?: {
      quality?:               string; // "high"
      provider?:              string; // "scribe_realtime"
      user_input_audio_format?: string;
    };
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        tools?: unknown[];
      };
      first_message: string;
      language: string;
    };
    tts: {
      voice_id:                      string;
      model_id:                      string;
      agent_output_audio_format?:    string; // "ulaw_8000" for phone, "pcm_16000" for web
      optimize_streaming_latency?:   number;
      stability?:                    number;
      similarity_boost?:             number;
      style?:                        number;
      speed?:                        number;
    };
    turn?: {
      turn_timeout?:    number;
      turn_eagerness?:  string; // "eager" | "relaxed"
      speculative_turn?: boolean;
      turn_model?:      string; // "turn_v2"
    };
  };
  platform_settings?: {
    overrides?: Record<string, unknown>;
  };
}

export interface ELAgent {
  agent_id: string;
  name:     string;
  created_at_unix_secs?: number;
  conversation_config?: ELAgentConfig["conversation_config"];
}

// ─── Voices ───────────────────────────────────────────────────────────────────

export async function listVoices(): Promise<ELVoice[]> {
  const data = await elevenlabsFetch<{ voices: ELVoice[] }>("/v1/voices");
  return data.voices ?? [];
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export async function createAgent(config: ELAgentConfig): Promise<ELAgent> {
  return elevenlabsFetch<ELAgent>("/v1/convai/agents/create", {
    method:  "POST",
    body:    JSON.stringify(config),
  });
}

export async function getAgent(agentId: string): Promise<ELAgent> {
  return elevenlabsFetch<ELAgent>(`/v1/convai/agents/${agentId}`);
}

export async function updateAgent(agentId: string, config: Partial<ELAgentConfig>): Promise<ELAgent> {
  return elevenlabsFetch<ELAgent>(`/v1/convai/agents/${agentId}`, {
    method: "PATCH",
    body:   JSON.stringify(config),
  });
}

export async function listAgents(): Promise<ELAgent[]> {
  const data = await elevenlabsFetch<{ agents: ELAgent[] }>("/v1/convai/agents");
  return data.agents ?? [];
}

export async function deleteAgent(agentId: string): Promise<void> {
  await fetch(`${BASE_URL}/v1/convai/agents/${agentId}`, {
    method:  "DELETE",
    headers: { "xi-api-key": getApiKey() },
  });
}

// ─── Default voice IDs ────────────────────────────────────────────────────────
// Fallback voices if the user hasn't picked one
export const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella (multilingual)
