import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { AgentConfigClient } from '@/components/voice-agent/AgentConfigClient'

interface Props { params: { businessId: string } }

export default async function AgentPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId, 'manager')
  const supabase = createClient()

  const { data: agentConfig } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('business_id', params.businessId)
    .single()

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Agent</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ρύθμιση και συγχρονισμός του ElevenLabs phone agent
        </p>
      </div>
      <AgentConfigClient
        businessId={params.businessId}
        agentConfig={agentConfig}
        agentId={business.elevenlabs_agent_id}
      />
    </div>
  )
}
