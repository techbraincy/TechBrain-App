import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireAgentSecret } from '@/lib/auth/agent-auth'

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const denied = requireAgentSecret(req)
  if (denied) return denied
  const admin = createAdminClient()
  const body  = await req.json().catch(() => ({}))
  const { date, time, party_size = 1 } = body

  if (!date || !time) {
    return NextResponse.json({ available: false, reason: 'Date and time are required' }, { status: 400 })
  }

  // Fetch config and hours
  const [{ data: config }, { data: hours }] = await Promise.all([
    admin.from('reservation_configs').select('*').eq('business_id', params.businessId).single(),
    admin.from('operating_hours').select('*').eq('business_id', params.businessId),
  ])

  // Check party size
  if (config && party_size > config.max_party_size) {
    return NextResponse.json({
      available: false,
      reason: `Maximum party size is ${config.max_party_size}`,
    })
  }

  // Check advance time constraints
  const requestedDt = new Date(`${date}T${time}:00`)
  const now = new Date()
  const minAdvanceMs = (config?.min_advance_minutes ?? 60) * 60 * 1000
  const maxAdvanceDays = config?.max_advance_days ?? 30

  if (requestedDt.getTime() - now.getTime() < minAdvanceMs) {
    return NextResponse.json({ available: false, reason: `Reservations must be made at least ${config?.min_advance_minutes ?? 60} minutes in advance` })
  }
  if ((requestedDt.getTime() - now.getTime()) > maxAdvanceDays * 86400000) {
    return NextResponse.json({ available: false, reason: `Reservations can only be made up to ${maxAdvanceDays} days in advance` })
  }

  // Check day of week
  const dow = requestedDt.getDay()
  const dayHours = hours?.find((h) => h.day_of_week === dow)

  if (!dayHours?.is_open || !dayHours.open_time || !dayHours.close_time) {
    return NextResponse.json({ available: false, reason: 'The business is closed on that day' })
  }

  if (time < dayHours.open_time.slice(0, 5) || time >= dayHours.close_time.slice(0, 5)) {
    return NextResponse.json({
      available: false,
      reason: `Outside business hours (${dayHours.open_time.slice(0, 5)}–${dayHours.close_time.slice(0, 5)})`,
    })
  }

  // Check existing reservations at that slot
  const slotStart = `${date}T${time}:00`
  const duration  = config?.slot_duration_minutes ?? 60
  const slotEnd   = new Date(new Date(slotStart).getTime() + duration * 60000).toISOString()

  const { data: existing } = await admin
    .from('reservations')
    .select('id')
    .eq('business_id', params.businessId)
    .gte('reserved_at', slotStart)
    .lt('reserved_at', slotEnd)
    .not('status', 'in', '("rejected","cancelled","no_show")')

  // Simple availability: slot is available if there's room (for now we allow unlimited, can be capped later)
  return NextResponse.json({
    available: true,
    slot_datetime: slotStart,
    existing_reservations: existing?.length ?? 0,
  })
}
