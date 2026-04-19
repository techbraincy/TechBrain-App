import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { z } from 'zod'

const cartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity:     z.number().int().min(1).max(50),
  notes:        z.string().max(300).optional().nullable(),
})

const orderSchema = z.object({
  fulfillment_type: z.enum(['takeaway', 'delivery']),
  items:            z.array(cartItemSchema).min(1, 'Cart is empty'),
  order_notes:      z.string().max(500).optional().nullable(),
  driver_comment:   z.string().max(300).optional().nullable(),
  tip_amount:       z.number().min(0).max(100).default(0),
  coupon_code:      z.string().max(50).optional().nullable(),
  payment_method:   z.enum(['cash', 'card', 'apple_pay', 'google_pay']).default('cash'),
  payment_reference: z.string().optional().nullable(),  // Stripe PaymentIntent ID for card
  // Delivery only
  address_id:       z.string().uuid().optional().nullable(),
  delivery_address: z.string().max(300).optional().nullable(),
  address_lat:      z.number().optional().nullable(),
  address_lng:      z.number().optional().nullable(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { fulfillment_type, items, order_notes, driver_comment, tip_amount,
          coupon_code, payment_method, payment_reference,
          address_id, delivery_address, address_lat, address_lng } = parsed.data

  if (fulfillment_type === 'delivery' && !delivery_address) {
    return NextResponse.json({ error: 'Delivery address required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch & validate menu items
  const itemIds = items.map((i) => i.menu_item_id)
  const { data: menuItems } = await admin
    .from('menu_items')
    .select('id, name_el, name_en, price, is_available, is_active')
    .eq('business_id', params.businessId)
    .in('id', itemIds)

  if (!menuItems || menuItems.length !== itemIds.length) {
    return NextResponse.json({ error: 'One or more items are unavailable' }, { status: 422 })
  }

  const menuMap = Object.fromEntries(menuItems.map((m) => [m.id, m]))
  for (const item of items) {
    if (!menuMap[item.menu_item_id]?.is_available || !menuMap[item.menu_item_id]?.is_active) {
      return NextResponse.json({ error: `${menuMap[item.menu_item_id]?.name_el ?? 'Item'} δεν είναι διαθέσιμο` }, { status: 422 })
    }
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(menuMap[item.menu_item_id].price) * item.quantity
  }, 0)

  const SERVICE_FEE = 0.30 // €0.30 flat service fee for app orders

  // Fetch delivery config
  let deliveryFee = 0
  if (fulfillment_type === 'delivery') {
    const { data: dc } = await admin
      .from('delivery_configs')
      .select('delivery_fee, min_order_amount, free_delivery_above')
      .eq('business_id', params.businessId)
      .maybeSingle()
    if (dc) {
      if (dc.min_order_amount && subtotal < Number(dc.min_order_amount)) {
        return NextResponse.json({
          error: `Ελάχιστη παραγγελία delivery: €${Number(dc.min_order_amount).toFixed(2)}`,
        }, { status: 422 })
      }
      deliveryFee = (dc.free_delivery_above && subtotal >= Number(dc.free_delivery_above))
        ? 0
        : Number(dc.delivery_fee)
    }
  }

  // Validate and apply coupon
  let couponId:       string | null = null
  let couponDiscount: number        = 0

  if (coupon_code) {
    const { data: coupon } = await admin
      .from('coupons')
      .select('*')
      .eq('business_id', params.businessId)
      .eq('code', coupon_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (coupon) {
      const now = new Date()
      const valid =
        (!coupon.valid_from  || new Date(coupon.valid_from)  <= now) &&
        (!coupon.valid_until || new Date(coupon.valid_until) >= now) &&
        (coupon.max_uses === null || coupon.uses_count < coupon.max_uses) &&
        subtotal >= Number(coupon.min_order_amount)

      if (valid) {
        couponId       = coupon.id
        couponDiscount = coupon.type === 'percent'
          ? Math.round(subtotal * (Number(coupon.value) / 100) * 100) / 100
          : Math.min(Number(coupon.value), subtotal)
      }
    }
  }

  const total = Math.max(0,
    subtotal + SERVICE_FEE + deliveryFee + tip_amount - couponDiscount
  )

  // Get customer profile
  const { data: profile } = await admin
    .from('app_customers')
    .select('first_name, last_name, phone, preferred_language')
    .eq('id', user.id)
    .single()

  // Get address snapshot if address_id provided
  let addressSnapshot: Record<string, unknown> | null = null
  if (address_id) {
    const { data: addr } = await admin
      .from('customer_addresses')
      .select('*')
      .eq('id', address_id)
      .eq('customer_id', user.id)
      .single()
    if (addr) addressSnapshot = addr as unknown as Record<string, unknown>
  }

  // Check features
  const { data: features } = await admin
    .from('business_features')
    .select('staff_approval_enabled')
    .eq('business_id', params.businessId)
    .single()

  const status = features?.staff_approval_enabled ? 'awaiting_approval' : 'accepted'

  // Generate reference
  const { data: refResult } = await admin.rpc('generate_order_reference', { p_business_id: params.businessId })
  const reference = refResult ?? `ORD-${Date.now()}`

  // Upsert customer record
  const { data: bizCustomer } = await admin
    .from('customers')
    .upsert(
      {
        business_id: params.businessId,
        phone:       profile?.phone ?? null,
        name:        `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
        language:    profile?.preferred_language ?? 'el',
      },
      { onConflict: 'business_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .maybeSingle()

  // Create order
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      business_id:       params.businessId,
      customer_id:       bizCustomer?.id ?? null,
      app_customer_id:   user.id,
      reference,
      type:              fulfillment_type === 'delivery' ? 'delivery' : 'takeaway',
      source:            'portal',
      status,
      subtotal:          Math.round(subtotal * 100) / 100,
      service_fee:       SERVICE_FEE,
      delivery_fee:      Math.round(deliveryFee * 100) / 100,
      tip_amount:        Math.round(tip_amount * 100) / 100,
      coupon_id:         couponId,
      coupon_code:       coupon_code?.toUpperCase() ?? null,
      coupon_discount:   Math.round(couponDiscount * 100) / 100,
      total:             Math.round(total * 100) / 100,
      delivery_address:  delivery_address ?? null,
      delivery_notes:    order_notes ?? null,
      driver_comment:    driver_comment ?? null,
      payment_method:    payment_method,
      payment_reference: payment_reference ?? null,
      address_snapshot:  addressSnapshot,
      customer_name:     `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || null,
      customer_phone:    profile?.phone ?? null,
      preferred_language: profile?.preferred_language ?? 'el',
      driver_lat:        address_lat ?? null,
      driver_lng:        address_lng ?? null,
    })
    .select('id, reference, status, total')
    .single()

  if (orderError || !order) {
    console.error('[shop/orders] order insert:', orderError)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }

  // Insert order items
  await admin.from('order_items').insert(
    items.map((item) => ({
      order_id:    order.id,
      business_id: params.businessId,
      menu_item_id: item.menu_item_id,
      name_el:     menuMap[item.menu_item_id].name_el,
      name_en:     menuMap[item.menu_item_id].name_en ?? null,
      unit_price:  Number(menuMap[item.menu_item_id].price),
      quantity:    item.quantity,
      subtotal:    Number(menuMap[item.menu_item_id].price) * item.quantity,
      notes:       item.notes ?? null,
    }))
  )

  // Increment coupon usage counter (non-critical, best-effort)
  if (couponId) {
    const { data: couponRow } = await admin
      .from('coupons')
      .select('uses_count')
      .eq('id', couponId)
      .single()
    if (couponRow) {
      await admin
        .from('coupons')
        .update({ uses_count: (couponRow.uses_count ?? 0) + 1 })
        .eq('id', couponId)
    }
  }

  return NextResponse.json({ order: { id: order.id, reference: order.reference, status: order.status, total: order.total } })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: orders } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('business_id', params.businessId)
    .eq('app_customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ orders: orders ?? [] })
}
