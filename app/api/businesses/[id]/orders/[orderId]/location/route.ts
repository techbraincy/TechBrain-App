import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  // Must be an authenticated business member
  const accessResult = await requireBusinessAccess(params.id).catch(() => null)
  if (!accessResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { lat: unknown; lng: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const lat = Number(body.lat)
  const lng = Number(body.lng)

  // Sanity-check coordinate ranges
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({
      driver_lat:        lat,
      driver_lng:        lng,
      driver_updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)
    .eq('business_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
