// Types mirror the live Supabase schema for reservations & orders.

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export type ReservationSource = 'phone' | 'portal' | 'staff'
export type Lang = 'el' | 'en'

export interface Reservation {
  id: string
  business_id: string
  customer_id: string | null
  reference: string
  reserved_at: string
  party_size: number
  duration_minutes: number
  status: ReservationStatus
  source: ReservationSource
  notes: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_language: Lang | null
  table_number: string | null
  rejection_reason: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export type OrderStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'completed'
  | 'cancelled'

export type OrderType = 'takeaway' | 'delivery' | 'dine_in'
export type OrderSource = 'phone' | 'portal' | 'staff' | 'webhook'

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  item_name: string
  item_name_en: string | null
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
}

export interface Order {
  id: string
  business_id: string
  reference: string
  type: OrderType
  status: OrderStatus
  source: OrderSource
  subtotal: number
  service_fee: number
  delivery_fee: number
  tip_amount: number
  coupon_discount: number
  total: number
  customer_name: string | null
  customer_phone: string | null
  customer_language: Lang | null
  payment_method: string | null
  payment_reference: string | null
  delivery_address: string | null
  notes: string | null
  rejection_reason: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OverviewStats {
  todayReservations: number
  todayReservationsDelta: number
  todayOrders: number
  todayOrdersDelta: number
  pendingReservations: number
  awaitingOrderApprovals: number
  todayRevenue: number
  todayRevenueDeltaPct: number
}

export interface ReservationFilterValues {
  from?: string
  to?: string
  status?: ReservationStatus | 'all'
  source?: ReservationSource | 'all'
  q?: string
}

export interface OrderFilterValues {
  from?: string
  to?: string
  status?: OrderStatus | 'all'
  type?: OrderType | 'all'
  source?: OrderSource | 'all'
  q?: string
}
