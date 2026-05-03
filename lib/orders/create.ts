import { createAdminClient } from '@/lib/db/supabase-server'
import type { CreateOrderInput, CreateOrderResult } from './types'

/**
 * Creates an order atomically via the create_order Postgres RPC.
 * The RPC handles: customer upsert, reference generation, order insert,
 * order_items insert, and idempotency record write — all in one transaction.
 *
 * If an idempotency_key is provided and was already recorded for this
 * business + endpoint, returns the cached result with replayed: true
 * without hitting the RPC again.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const admin = createAdminClient()
  const endpoint = input.endpoint ?? 'POST /api/orders'

  // Idempotency lookup — fast path before touching orders tables
  if (input.idempotency_key) {
    const { data: cached } = await admin
      .from('request_idempotency')
      .select('response')
      .eq('business_id', input.business_id)
      .eq('idempotency_key', input.idempotency_key)
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (cached) {
      const r = cached.response as { order_id: string; reference: string; status: string }
      return { order_id: r.order_id, reference: r.reference, status: r.status, replayed: true }
    }
  }

  // Map items to the shape the RPC expects (name_el, not name)
  const rpcItems = input.items.map((it) => ({
    name_el:    it.name,
    name_en:    it.name_en ?? null,
    unit_price: it.unit_price,
    quantity:   it.quantity,
    notes:      it.notes ?? null,
  }))

  const { data, error } = await admin.rpc('create_order', {
    p_business_id:      input.business_id,
    p_customer_name:    input.customer_name,
    p_customer_phone:   input.customer_phone,
    p_type:             input.type,
    p_source:           input.source,
    p_items:            rpcItems,
    p_delivery_address: input.delivery_address ?? null,
    p_notes:            input.notes ?? null,
    p_subtotal:         input.subtotal ?? 0,
    p_total:            input.total ?? 0,
    p_language:         input.language ?? 'el',
    p_idempotency_key:  input.idempotency_key ?? null,
    p_endpoint:         endpoint,
  })

  if (error || !data) {
    console.error('[orders/create] RPC error', error)
    throw new Error(error?.message ?? 'Failed to create order')
  }

  const result = data as { order_id: string; reference: string; status: string }
  return {
    order_id:  result.order_id,
    reference: result.reference,
    status:    result.status,
  }
}
