import { NextRequest, NextResponse } from 'next/server'
import { requireAgentSecret } from '@/lib/auth/agent-auth'
import { createOrder } from '@/lib/orders/create'
import type { OrderItemInput } from '@/lib/orders/types'
import type { OrderType } from '@/types/db'

const ENDPOINT = 'POST /api/agent/order'

/**
 * Thin shim — delegates to createOrder() in lib/orders/create.ts.
 * Parses the agent's free-form items string ("2x Coffee, 1x Croissant")
 * into structured OrderItemInput[], then calls the same atomic RPC
 * used by the unified POST /api/orders endpoint.
 *
 * Kept for deployed ElevenLabs agents that point at this URL.
 * Migrate agents to POST /api/orders in a future sprint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const denied = requireAgentSecret(req)
  if (denied) return denied

  // Idempotency key is required for all agent requests
  const idempotencyKey = req.headers.get('idempotency-key')
  if (!idempotencyKey) {
    return NextResponse.json(
      { success: false, error: 'Idempotency-Key header is required' },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => ({}))
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

  // Parse agent's comma-separated string: "2x Coffee, 1x Croissant"
  const parsedItems: OrderItemInput[] = String(items)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)[x×]\s*(.+)$/i)
      return {
        name:       match ? match[2].trim() : line,
        quantity:   match ? Number(match[1]) : 1,
        unit_price: 0,
      }
    })

  if (parsedItems.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid items parsed from items string' },
      { status: 400 }
    )
  }

  const lang: string = language ?? 'el'

  try {
    const result = await createOrder({
      business_id:      params.businessId,
      customer_name,
      customer_phone,
      type:             type as OrderType,
      source:           'phone',
      items:            parsedItems,
      delivery_address: delivery_address ?? null,
      notes:            notes ?? null,
      language:         lang,
      idempotency_key:  idempotencyKey,
      endpoint:         ENDPOINT,
    })

    const msg =
      result.status === 'awaiting_approval'
        ? lang === 'en'
          ? `Your order has been received. Reference: ${result.reference}. We will confirm shortly.`
          : `Η παραγγελία σας ελήφθη. Αριθμός: ${result.reference}. Θα επιβεβαιωθεί σύντομα.`
        : lang === 'en'
          ? `Your order is confirmed! Reference: ${result.reference}.`
          : `Η παραγγελία σας επιβεβαιώθηκε! Αριθμός: ${result.reference}.`

    return NextResponse.json({
      success:   true,
      reference: result.reference,
      status:    result.status,
      message:   msg,
      ...(result.replayed ? { replayed: true } : {}),
    })
  } catch (err) {
    console.error('[agent/order]', err)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }
}
