import { NextRequest, NextResponse } from 'next/server'
import { getUser, getSession } from '@/lib/auth/session'
import { requireAgentSecret } from '@/lib/auth/agent-auth'
import { validateOrderInput } from '@/lib/orders/validate'
import { createOrder } from '@/lib/orders/create'
import type { OrderSource } from '@/types/db'

const ENDPOINT = 'POST /api/orders'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  // -----------------------------------------------------------------------
  // Auth — two mutually exclusive paths
  // -----------------------------------------------------------------------
  const user = await getUser()
  let source: OrderSource
  let idempotencyKey: string | null = null

  if (user) {
    // Path A: authenticated session (admin / portal / staff)
    const session = await getSession()
    const businessId = typeof body.business_id === 'string' ? body.business_id.trim() : null

    if (!businessId || !session?.businesses.find((b) => b.id === businessId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: no membership for this business' },
        { status: 403 }
      )
    }

    const biz = session!.businesses.find((b) => b.id === businessId)!
    source = biz.role === 'owner' || biz.role === 'manager' ? 'staff' : 'portal'

    // Idempotency key is optional for authenticated callers in v1
    idempotencyKey = req.headers.get('idempotency-key')
  } else {
    // Path B: ElevenLabs agent — shared secret required
    const denied = requireAgentSecret(req)
    if (denied) return denied

    // Idempotency key is REQUIRED for agent path
    idempotencyKey = req.headers.get('idempotency-key')
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'Idempotency-Key header is required for agent requests' },
        { status: 400 }
      )
    }

    source = 'phone'
  }

  // -----------------------------------------------------------------------
  // Validate input (rejects forbidden fields, validates all required fields)
  // -----------------------------------------------------------------------
  const validation = validateOrderInput(body)
  if (!validation.ok) {
    return NextResponse.json({ success: false, errors: validation.errors }, { status: 400 })
  }

  // -----------------------------------------------------------------------
  // Create order — atomic RPC (includes idempotency lookup + write)
  // -----------------------------------------------------------------------
  try {
    const result = await createOrder({
      ...validation.data,
      source,
      idempotency_key: idempotencyKey,
      endpoint: ENDPOINT,
    })

    return NextResponse.json({
      success:   true,
      reference: result.reference,
      order_id:  result.order_id,
      status:    result.status,
      ...(result.replayed ? { replayed: true } : {}),
    })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }
}
