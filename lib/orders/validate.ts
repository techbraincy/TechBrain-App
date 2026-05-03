import type { OrderType } from '@/types/db'
import type { OrderItemInput, CreateOrderInput } from './types'

const ORDER_TYPES: OrderType[] = ['takeaway', 'delivery', 'dine_in']
const PHONE_RE = /^[+\d\s\-()]{7,}$/
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Fields the client must never send — server always sets these
const FORBIDDEN_FIELDS = ['source', 'reference', 'status', 'id', 'created_at', 'updated_at']

interface ValidationError {
  field: string
  message: string
}

export type ValidateOrderResult =
  | { ok: true;  data: Omit<CreateOrderInput, 'source' | 'idempotency_key' | 'endpoint'> }
  | { ok: false; errors: ValidationError[] }

export function validateOrderInput(raw: Record<string, unknown>): ValidateOrderResult {
  const errors: ValidationError[] = []

  // Reject forbidden fields
  for (const f of FORBIDDEN_FIELDS) {
    if (f in raw) {
      errors.push({ field: f, message: `${f} must not be sent by the client` })
    }
  }

  // business_id
  const business_id = typeof raw.business_id === 'string' ? raw.business_id.trim() : ''
  if (!business_id || !UUID_RE.test(business_id)) {
    errors.push({ field: 'business_id', message: 'business_id must be a valid UUID' })
  }

  // customer_name
  const customer_name = typeof raw.customer_name === 'string' ? raw.customer_name.trim() : ''
  if (!customer_name) {
    errors.push({ field: 'customer_name', message: 'customer_name is required' })
  }

  // customer_phone
  const customer_phone = typeof raw.customer_phone === 'string' ? raw.customer_phone.trim() : ''
  if (!customer_phone || !PHONE_RE.test(customer_phone)) {
    errors.push({ field: 'customer_phone', message: 'customer_phone must be a valid phone number (min 7 chars)' })
  }

  // type
  const type = raw.type as string
  if (!ORDER_TYPES.includes(type as OrderType)) {
    errors.push({ field: 'type', message: `type must be one of: ${ORDER_TYPES.join(', ')}` })
  }

  // items — non-empty array of structured objects
  const rawItems = raw.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    errors.push({ field: 'items', message: 'items must be a non-empty array' })
  } else {
    rawItems.forEach((item: unknown, i: number) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push({ field: `items[${i}]`, message: 'each item must be an object' })
        return
      }
      const it = item as Record<string, unknown>
      if (typeof it.name !== 'string' || !it.name.trim()) {
        errors.push({ field: `items[${i}].name`, message: 'item name is required' })
      }
      const qty = Number(it.quantity)
      if (!Number.isInteger(qty) || qty < 1) {
        errors.push({ field: `items[${i}].quantity`, message: 'quantity must be an integer >= 1' })
      }
      const price = Number(it.unit_price)
      if (isNaN(price) || price < 0) {
        errors.push({ field: `items[${i}].unit_price`, message: 'unit_price must be a number >= 0' })
      }
    })
  }

  // delivery_address required when type === 'delivery'
  const delivery_address =
    typeof raw.delivery_address === 'string' ? raw.delivery_address.trim() || null : null
  if (type === 'delivery' && !delivery_address) {
    errors.push({ field: 'delivery_address', message: 'delivery_address is required when type is delivery' })
  }

  // Optional subtotal cross-check (1-cent tolerance)
  let subtotal: number | null = null
  if (raw.subtotal != null) {
    subtotal = Number(raw.subtotal)
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const computed = (rawItems as any[]).reduce(
        (sum: number, it: any) =>
          sum + Number(it.unit_price ?? 0) * Number(it.quantity ?? 1),
        0
      )
      if (Math.abs(computed - subtotal) > 0.01) {
        errors.push({
          field: 'subtotal',
          message: `subtotal ${subtotal} does not match computed ${computed.toFixed(2)}`,
        })
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  const items: OrderItemInput[] = (rawItems as any[]).map((it: any) => ({
    name:       String(it.name).trim(),
    name_en:    typeof it.name_en === 'string' && it.name_en.trim() ? it.name_en.trim() : undefined,
    quantity:   Number(it.quantity),
    unit_price: Number(it.unit_price),
    notes:      typeof it.notes === 'string' && it.notes.trim() ? it.notes.trim() : undefined,
  }))

  return {
    ok: true,
    data: {
      business_id,
      customer_name,
      customer_phone,
      type: type as OrderType,
      items,
      delivery_address,
      notes:    typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null,
      subtotal,
      total:    raw.total != null ? Number(raw.total) : null,
      language: typeof raw.language === 'string' ? raw.language : 'el',
    },
  }
}
