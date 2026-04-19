import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  let body: { code?: unknown; subtotal?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const code     = String(body.code ?? '').trim().toUpperCase()
  const subtotal = Number(body.subtotal ?? 0)

  if (!code) return NextResponse.json({ error: 'Coupon code required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: coupon } = await admin
    .from('coupons')
    .select('*')
    .eq('business_id', params.businessId)
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (!coupon) {
    return NextResponse.json({ valid: false, error: 'Κωδικός έκπτωσης δεν βρέθηκε' }, { status: 422 })
  }

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return NextResponse.json({ valid: false, error: 'Ο κωδικός δεν είναι ακόμα ενεργός' }, { status: 422 })
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return NextResponse.json({ valid: false, error: 'Ο κωδικός έχει λήξει' }, { status: 422 })
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: 'Ο κωδικός έχει εξαντληθεί' }, { status: 422 })
  }
  if (subtotal < Number(coupon.min_order_amount)) {
    return NextResponse.json({
      valid: false,
      error: `Ελάχιστη παραγγελία €${Number(coupon.min_order_amount).toFixed(2)} για αυτόν τον κωδικό`,
    }, { status: 422 })
  }

  // Calculate discount
  let discount = 0
  if (coupon.type === 'percent') {
    discount = Math.round(subtotal * (Number(coupon.value) / 100) * 100) / 100
  } else {
    discount = Math.min(Number(coupon.value), subtotal)
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      id:       coupon.id,
      code:     coupon.code,
      type:     coupon.type,
      value:    coupon.value,
      discount: discount,
    },
  })
}
