import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'
import { buildAgentPayload } from '@/lib/elevenlabs/agent-builder'
import { syncAgent } from '@/lib/elevenlabs/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 })
  }

  const admin = createAdminClient()

  const [bizRes, featRes, agentRes, hoursRes, menuRes, faqRes, resConfigRes, delConfigRes] = await Promise.all([
    admin.from('businesses').select('*').eq('id', params.id).single(),
    admin.from('business_features').select('*').eq('business_id', params.id).single(),
    admin.from('agent_configs').select('*').eq('business_id', params.id).single(),
    admin.from('operating_hours').select('*').eq('business_id', params.id),
    admin.from('menu_items').select('*').eq('business_id', params.id).eq('is_active', true),
    admin.from('faqs').select('*').eq('business_id', params.id).eq('is_active', true),
    admin.from('reservation_configs').select('*').eq('business_id', params.id).maybeSingle(),
    admin.from('delivery_configs').select('*').eq('business_id', params.id).maybeSingle(),
  ])

  if (!bizRes.data || !featRes.data || !agentRes.data) {
    return NextResponse.json({ error: 'Business config not found' }, { status: 404 })
  }

  // Mark as syncing
  await admin.from('agent_configs').update({ sync_status: 'pending', sync_error: null }).eq('business_id', params.id)

  try {
    const payload = buildAgentPayload({
      business:          bizRes.data as any,
      features:          featRes.data as any,
      agentConfig:       agentRes.data as any,
      hours:             hoursRes.data ?? [],
      menuItems:         menuRes.data ?? [],
      faqs:              faqRes.data ?? [],
      reservationConfig: resConfigRes.data ?? undefined,
      deliveryConfig:    delConfigRes.data ?? undefined,
    })

    const newAgentId = await syncAgent(bizRes.data.elevenlabs_agent_id, payload)

    await Promise.all([
      admin.from('businesses').update({ elevenlabs_agent_id: newAgentId }).eq('id', params.id),
      admin.from('agent_configs').update({
        sync_status:    'synced',
        sync_error:     null,
        last_synced_at: new Date().toISOString(),
      }).eq('business_id', params.id),
    ])

    await admin.from('audit_log').insert({
      business_id: params.id,
      user_id:     session.user.id,
      action:      'agent.synced',
      entity_type: 'agent_config',
      new_data:    { agent_id: newAgentId },
    })

    return NextResponse.json({ success: true, agentId: newAgentId })
  } catch (err: any) {
    await admin.from('agent_configs').update({
      sync_status: 'failed',
      sync_error:  err.message,
    }).eq('business_id', params.id)

    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
