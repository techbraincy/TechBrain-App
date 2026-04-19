import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const admin = createAdminClient()
  const body  = await req.json().catch(() => ({}))
  const { customer_name, customer_phone, type, items, delivery_address, notes, language } = body

  if (!customer_name || !customer_phone || !type || !items) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: customer_name, customer_phone, type, items' },
      { status: 400 }
    )
  }

  if (type === 'delivery' && !delivery_address) {
    return NextResponse.json(
      { success: false, error: 'delivery_address is required for delivery orders' },
      { status: 400 }
    )
  }

  // Upsert customer
  let customerId: string | null = null
  const { data: customer } = await admin
    .from('customers')
    .upsert(
      { business_id: params.businessId, phone: customer_phone, name: customer_name, language: language ?? 'el' },
      { onConflict: 'business_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()
  customerId = customer?.id ?? null

  // Get approval config
  const { data: features } = await admin
    .from('business_features')
    .select('staff_approval_enabled')
    .eq('business_id', params.businessId)
    .single()

  // Generate reference
  const { data: refResult } = await admin.rpc('generate_order_reference', { p_business_id: params.businessId })
  const reference = refResult ?? `ORD-${Date.now()}`

  const status = features?.staff_approval_enabled ? 'awaiting_approval' : 'accepted'

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      business_id:       params.businessId,
      customer_id:       customerId,
      reference,
      type,
      source:            'phone',
      status,
      customer_name,
      customer_phone,
      delivery_address:  delivery_address ?? null,
      delivery_notes:    notes ?? null,
      preferred_language: language ?? 'el',
      subtotal:          0,
      delivery_fee:      0,
      total:             0,
    })
    .select('reference, status')
    .single()

  if (error || !order) {
    console.error('[agent/order]', error)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }

  // Parse items string and create order_items (best effort)
  const itemLines = String(items).split(',').map((s) => s.trim()).filter(Boolean)
  const orderItems = itemLines.map((line) => {
    const match = line.match(/^(\d+)[x×]\s*(.+)$/i)
    const qty  = match ? Number(match[1]) : 1
    const name = match ? match[2].trim() : line
    return { order_id: order.reference, business_id: params.businessId, name_el: name, unit_price: 0, quantity: qty }
  })

  if (orderItems.length) {
    // We need the actual order.id — fetch it
    const { data: fullOrder } = await admin
      .from('orders')
      .select('id')
      .eq('business_id', params.businessId)
      .eq('reference', reference)
      .single()

    if (fullOrder) {
      await admin.from('order_items').insert(
        orderItems.map((i) => ({ ...i, order_id: fullOrder.id }))
      )
    }
  }

  const msg =
    status === 'awaiting_approval'
      ? (language === 'en'
          ? `Your order has been received. Reference: ${reference}. We will confirm shortly.`
          : `Η παραγγελία σας ελήφθη. Αριθμός: ${reference}. Θα επιβεβαιωθεί σύντομα.`)
      : (language === 'en'
          ? `Your order is confirmed! Reference: ${reference}.`
          : `Η παραγγελία σας επιβεβαιώθηκε! Αριθμός: ${reference}.`)

  return NextResponse.json({ success: true, reference, status, message: msg })
}
