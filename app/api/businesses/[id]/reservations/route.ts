import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'
import type { ReservationStatus } from '@/types/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url    = new URL(req.url)
  const status = url.searchParams.get('status')
  const from   = url.searchParams.get('from')
  const to     = url.searchParams.get('to')

  const supabase = createClient()
  let query = supabase
    .from('reservations')
    .select('*, customer:customers(id, name, phone)')
    .eq('business_id', params.id)
    .order('reserved_at', { ascending: true })
    .limit(200)

  if (status) query = query.eq('status', status)
  if (from)   query = query.gte('reserved_at', `${from}T00:00:00`)
  if (to)     query = query.lte('reserved_at', `${to}T23:59:59`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ reservations: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Bulk status update used by the approvals queue
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reservationId, status, rejection_reason } = await req.json().catch(() => ({}))
  if (!reservationId || !status) return NextResponse.json({ error: 'reservationId and status required' }, { status: 400 })

  const admin = createAdminClient()
  const update: Record<string, unknown> = { status }
  if (status === 'confirmed') {
    update.confirmed_by = session.user.id
    update.confirmed_at = new Date().toISOString()
  }
  if (status === 'rejected') {
    update.rejected_by      = session.user.id
    update.rejected_at      = new Date().toISOString()
    update.rejection_reason = rejection_reason ?? null
  }

  const { data, error } = await admin
    .from('reservations')
    .update(update)
    .eq('id', reservationId)
    .eq('business_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    business_id: params.id,
    user_id:     session.user.id,
    action:      `reservation.${status}`,
    entity_type: 'reservation',
    entity_id:   reservationId,
    new_data:    { status, rejection_reason },
  })

  return NextResponse.json({ reservation: data })
}
