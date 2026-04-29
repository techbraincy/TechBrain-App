import { createAdminClient } from '@/lib/db/supabase-server'
import type {
  Reservation,
  Order,
  OverviewStats,
  ReservationFilterValues,
  OrderFilterValues,
} from './types'

const startOfDayISO = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString()

const endOfDayISO = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString()

const yesterday = () => {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return y
}

export async function getOverviewStats(businessId: string): Promise<OverviewStats> {
  const admin = createAdminClient()
  const today = { start: startOfDayISO(), end: endOfDayISO() }
  const y = yesterday()
  const yest = { start: startOfDayISO(y), end: endOfDayISO(y) }

  const [
    todayResv,
    yestResv,
    todayOrd,
    yestOrd,
    pendingResv,
    awaitingOrd,
    todayRevenue,
    yestRevenue,
  ] = await Promise.all([
    admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('reserved_at', today.start)
      .lte('reserved_at', today.end),
    admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('reserved_at', yest.start)
      .lte('reserved_at', yest.end),
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', today.start)
      .lte('created_at', today.end),
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', yest.start)
      .lte('created_at', yest.end),
    admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending'),
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'awaiting_approval'),
    admin
      .from('orders')
      .select('total')
      .eq('business_id', businessId)
      .gte('created_at', today.start)
      .lte('created_at', today.end)
      .in('status', ['accepted', 'preparing', 'ready', 'dispatched', 'completed']),
    admin
      .from('orders')
      .select('total')
      .eq('business_id', businessId)
      .gte('created_at', yest.start)
      .lte('created_at', yest.end)
      .in('status', ['accepted', 'preparing', 'ready', 'dispatched', 'completed']),
  ])

  const sum = (rows: { total: number }[] | null) =>
    (rows ?? []).reduce((a, r) => a + Number(r.total ?? 0), 0)

  const todayRev = sum(todayRevenue.data as any)
  const yestRev = sum(yestRevenue.data as any)
  const deltaPct = yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0

  return {
    todayReservations: todayResv.count ?? 0,
    todayReservationsDelta: (todayResv.count ?? 0) - (yestResv.count ?? 0),
    todayOrders: todayOrd.count ?? 0,
    todayOrdersDelta: (todayOrd.count ?? 0) - (yestOrd.count ?? 0),
    pendingReservations: pendingResv.count ?? 0,
    awaitingOrderApprovals: awaitingOrd.count ?? 0,
    todayRevenue: todayRev,
    todayRevenueDeltaPct: deltaPct,
  }
}

export async function getTodayReservations(businessId: string, limit = 8): Promise<Reservation[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('reservations')
    .select('*')
    .eq('business_id', businessId)
    .gte('reserved_at', startOfDayISO())
    .lte('reserved_at', endOfDayISO())
    .order('reserved_at', { ascending: true })
    .limit(limit)
  return (data ?? []) as Reservation[]
}

export async function getTodayOrders(businessId: string, limit = 8): Promise<Order[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startOfDayISO())
    .lte('created_at', endOfDayISO())
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Order[]
}

export async function getNextThirtyMinReservations(businessId: string): Promise<Reservation[]> {
  const admin = createAdminClient()
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 60 * 1000)
  const { data } = await admin
    .from('reservations')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .gte('reserved_at', now.toISOString())
    .lte('reserved_at', in30.toISOString())
    .order('reserved_at', { ascending: true })
  return (data ?? []) as Reservation[]
}

export async function listReservations(
  businessId: string,
  f: ReservationFilterValues = {},
  page = 1,
  pageSize = 50,
): Promise<{ rows: Reservation[]; total: number }> {
  const admin = createAdminClient()
  let q = admin
    .from('reservations')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('reserved_at', { ascending: false })

  if (f.from) q = q.gte('reserved_at', new Date(f.from).toISOString())
  if (f.to) q = q.lte('reserved_at', endOfDayISO(new Date(f.to)))
  if (f.status && f.status !== 'all') q = q.eq('status', f.status)
  if (f.source && f.source !== 'all') q = q.eq('source', f.source)
  if (f.q && f.q.trim()) {
    const term = f.q.trim()
    q = q.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,reference.ilike.%${term}%`,
    )
  }

  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, count } = await q
  return { rows: (data ?? []) as Reservation[], total: count ?? 0 }
}

export async function listOrders(
  businessId: string,
  f: OrderFilterValues = {},
  page = 1,
  pageSize = 50,
): Promise<{ rows: Order[]; total: number }> {
  const admin = createAdminClient()
  let q = admin
    .from('orders')
    .select('*, items:order_items(*)', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (f.from) q = q.gte('created_at', new Date(f.from).toISOString())
  if (f.to) q = q.lte('created_at', endOfDayISO(new Date(f.to)))
  if (f.status && f.status !== 'all') q = q.eq('status', f.status)
  if (f.type && f.type !== 'all') q = q.eq('type', f.type)
  if (f.source && f.source !== 'all') q = q.eq('source', f.source)
  if (f.q && f.q.trim()) {
    const term = f.q.trim()
    q = q.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,reference.ilike.%${term}%`,
    )
  }

  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, count } = await q
  return { rows: (data ?? []) as unknown as Order[], total: count ?? 0 }
}

export async function getReservationById(
  businessId: string,
  id: string,
): Promise<Reservation | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('reservations')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', id)
    .single()
  return (data as Reservation) ?? null
}

export async function getOrderById(businessId: string, id: string): Promise<Order | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('business_id', businessId)
    .eq('id', id)
    .single()
  return (data as unknown as Order) ?? null
}
