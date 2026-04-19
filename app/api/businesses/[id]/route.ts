import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const allowed = [
    'name', 'description', 'email', 'phone', 'website',
    'address', 'city', 'postal_code', 'country', 'timezone', 'locale',
    'primary_color', 'accent_color',
  ]
  const update: Record<string, unknown> = {}
  allowed.forEach((key) => { if (body[key] !== undefined) update[key] = body[key] })

  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await admin
    .from('businesses')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    business_id: params.id,
    user_id:     session.user.id,
    action:      'business.updated',
    entity_type: 'business',
    entity_id:   params.id,
    new_data:    update,
  })

  return NextResponse.json({ business: data })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('businesses')
    .select('*, business_features(*), agent_configs(*), operating_hours(*), reservation_configs(*), delivery_configs(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ business: data })
}
