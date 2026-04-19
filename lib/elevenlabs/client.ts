const BASE_URL = 'https://api.elevenlabs.io/v1'

function headers() {
  return {
    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    'Content-Type': 'application/json',
  }
}

export interface ElevenLabsTool {
  type: 'webhook'
  name: string
  description: string
  response_timeout_secs?: number
  api_schema: {
    url: string
    method: 'GET' | 'POST'
    request_headers?: Record<string, string>
    request_body_schema?: {
      type: 'object'
      description?: string
      properties: Record<string, { type: string; description?: string; enum?: string[] }>
      required?: string[]
    }
  }
}

export interface ElevenLabsAgentPayload {
  name: string
  conversation_config: {
    agent: {
      prompt: {
        prompt: string
        tools: ElevenLabsTool[]
      }
      first_message: string
      language: string
    }
    tts: {
      model_id: string
      voice_id: string
    }
    conversation: {
      max_duration_seconds: number
    }
  }
}

export async function createAgent(payload: ElevenLabsAgentPayload): Promise<string> {
  const res = await fetch(`${BASE_URL}/convai/agents/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ElevenLabs createAgent failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.agent_id as string
}

export async function deleteAgent(agentId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/convai/agents/${agentId}`, {
    method: 'DELETE',
    headers: headers(),
  })

  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`ElevenLabs deleteAgent failed (${res.status}): ${text}`)
  }
}

/** Delete then recreate — the only reliable way to sync tools/prompt changes. */
export async function syncAgent(
  existingAgentId: string | null,
  payload: ElevenLabsAgentPayload
): Promise<string> {
  if (existingAgentId) {
    await deleteAgent(existingAgentId)
  }
  return createAgent(payload)
}
