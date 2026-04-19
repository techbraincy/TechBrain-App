import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'
import type { OrderStatus } from '@/types/db'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:            ['awaiting_approval', 'accepted', 'cancelled'],
  awaiting_approval:  ['accepted', 'rejected', 'cancelled'],
  accepted:           ['preparing', 'cancelled'],
  rejected:           [],
  preparing:          ['ready', 'dispatched', 'cancelled'],
  ready:              ['completed', 'cancelled'],
  dispatched:         ['completed', 'cancelled'],
  completed:          [],
  cancelled:          [],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { status, rejection_reason, estimated_minutes } = body

  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const supabase = createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', params.orderId)
    .eq('business_id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[order.status as OrderStatus] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${status}` },
      { status: 422 }
    )
  }

  const update: Record<string, unknown> = { status }
  if (status === 'accepted') {
    update.accepted_by = session.user.id
    update.accepted_at = new Date().toISOString()
    if (estimated_minutes) update.estimated_minutes = estimated_minutes
  }
  if (status === 'rejected') {
    update.rejected_by      = session.user.id
    update.rejected_at      = new Date().toISOString()
    update.rejection_reason = rejection_reason ?? null
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .update(update)
    .eq('id', params.orderId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit
  await admin.from('audit_log').insert({
    business_id: params.id,
    user_id:     session.user.id,
    action:      `order.${status}`,
    entity_type: 'order',
    entity_id:   params.orderId,
    new_data:    { status, rejection_reason },
  })

  return NextResponse.json({ order: data })
}
