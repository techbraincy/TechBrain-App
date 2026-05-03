import type { OrderType, OrderSource } from '@/types/db'

export interface OrderItemInput {
  name: string       // stored as name_el in order_items
  name_en?: string
  quantity: number
  unit_price: number
  notes?: string
}

export interface CreateOrderInput {
  business_id: string
  customer_name: string
  customer_phone: string
  type: OrderType
  source: OrderSource  // always server-set, never accepted from client
  items: OrderItemInput[]
  delivery_address?: string | null
  notes?: string | null
  subtotal?: number | null
  total?: number | null
  language?: string
  idempotency_key?: string | null
  endpoint?: string   // identifies the calling route for idempotency storage
}

export interface CreateOrderResult {
  order_id: string
  reference: string
  status: string
  replayed?: boolean
}
