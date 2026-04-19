import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const admin = createAdminClient()
  const body  = await req.json().catch(() => ({}))
  const { reference, new_date, new_time } = body

  if (!reference || !new_date || !new_time) {
    return NextResponse.json(
      { success: false, error: 'reference, new_date, and new_time are required' },
      { status: 400 }
    )
  }

  const newReservedAt = `${new_date}T${new_time}:00`

  const { data, error } = await admin
    .from('reservations')
    .update({ reserved_at: newReservedAt, status: 'pending' })
    .eq('business_id', params.businessId)
    .eq('reference', reference.toUpperCase())
    .not('status', 'in', '("cancelled","completed","no_show")')
    .select('reference, reserved_at, status')
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Reservation not found or cannot be rescheduled' }, { status: 404 })
  }

  return NextResponse.json({ success: true, reference: data.reference, new_datetime: newReservedAt })
}
