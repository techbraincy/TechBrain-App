import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { error } = await admin
    .from('agent_configs')
    .update({
      agent_name:               body.agent_name,
      language:                 body.language,
      tone:                     body.tone,
      greeting_greek:           body.greeting_greek ?? null,
      greeting_english:         body.greeting_english ?? null,
      custom_instructions:      body.custom_instructions ?? null,
      escalation_enabled:       body.escalation_enabled,
      escalation_phone:         body.escalation_phone ?? null,
      escalation_message_greek: body.escalation_message_greek ?? null,
      escalation_message_english: body.escalation_message_english ?? null,
      sync_status:              'pending', // mark as needing re-sync
    })
    .eq('business_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
