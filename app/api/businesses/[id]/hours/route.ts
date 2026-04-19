import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body  = await req.json().catch(() => ({}))
  const hours = body.hours as Array<{ day_of_week: number; is_open: boolean; open_time?: string; close_time?: string }>

  if (!Array.isArray(hours)) return NextResponse.json({ error: 'hours array required' }, { status: 400 })

  const admin = createAdminClient()

  // Upsert all days
  const rows = hours.map((h) => ({
    business_id: params.id,
    day_of_week: h.day_of_week,
    is_open:     h.is_open,
    open_time:   h.is_open ? (h.open_time ?? null) : null,
    close_time:  h.is_open ? (h.close_time ?? null) : null,
  }))

  const { error } = await admin
    .from('operating_hours')
    .upsert(rows, { onConflict: 'business_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
