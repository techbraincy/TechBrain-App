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

const REVENUE_STATUSES = ['accepted', 'preparing', 'ready', 'dispatched', 'completed']

export async function getOverviewStats(businessId: string): Promise<OverviewStats> {
  const t0 = Date.now()
  const admin = createAdminClient()
  const today = { start: startOfDayISO(), end: endOfDayISO() }
  const y = yesterday()
  const yest = { start: startOfDayISO(y), end: endOfDayISO(y) }

  // Two-day window for both tables — fetch minimal rows once, derive every metric in JS.
  // Replaces 8 round trips (incl. expensive `count: 'exact'`) with 4 — all in parallel.
  const [reservationsRows, ordersRows, pendingResvRes, awaitingOrdRes] = await Promise.all([
    admin
      .from('reservations')
      .select('reserved_at')
      .eq('business_id', businessId)
      .gte('reserved_at', yest.start)
      .lte('reserved_at', today.end),
    admin
      .from('orders')
      .select('created_at, total, status')
      .eq('business_id', businessId)
      .gte('created_at', yest.start)
      .lte('created_at', today.end),
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
  ])

  let todayResvCount = 0
  let yestResvCount = 0
  for (const r of (reservationsRows.data ?? []) as { reserved_at: string }[]) {
    if (r.reserved_at >= today.start && r.reserved_at <= today.end) todayResvCount++
    else if (r.reserved_at >= yest.start && r.reserved_at <= yest.end) yestResvCount++
  }

  let todayOrdCount = 0
  let yestOrdCount = 0
  let todayRev = 0
  let yestRev = 0
  for (const o of (ordersRows.data ?? []) as { created_at: string; total: number | null; status: string }[]) {
    const inToday = o.created_at >= today.start && o.created_at <= today.end
    const inYest = !inToday && o.created_at >= yest.start && o.created_at <= yest.end
    if (inToday) todayOrdCount++
    else if (inYest) yestOrdCount++
    if (REVENUE_STATUSES.includes(o.status)) {
      const v = Number(o.total ?? 0)
      if (inToday) todayRev += v
      else if (inYest) yestRev += v
    }
  }

  const deltaPct = yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0
  console.log(`[ADMIN_PERF] getOverviewStats bid=${businessId.slice(0, 6)}.. ${Date.now() - t0}ms`)

  return {
    todayReservations: todayResvCount,
    todayReservationsDelta: todayResvCount - yestResvCount,
    todayOrders: todayOrdCount,
    todayOrdersDelta: todayOrdCount - yestOrdCount,
    pendingReservations: pendingResvRes.count ?? 0,
    awaitingOrderApprovals: awaitingOrdRes.count ?? 0,
    todayRevenue: todayRev,
    todayRevenueDeltaPct: deltaPct,
  }
}

export async function getTodayReservations(businessId: string, limit = 8): Promise<Reservation[]> {
  const t0 = Date.now()
  const admin = createAdminClient()
  const { data } = await admin
    .from('reservations')
    .select('*')
    .eq('business_id', businessId)
    .gte('reserved_at', startOfDayISO())
    .lte('reserved_at', endOfDayISO())
    .order('reserved_at', { ascending: true })
    .limit(limit)
  console.log(`[ADMIN_PERF] getTodayReservations bid=${businessId.slice(0, 6)}.. ${Date.now() - t0}ms rows=${data?.length ?? 0}`)
  return (data ?? []) as Reservation[]
}

export async function getTodayOrders(businessId: string, limit = 8): Promise<Order[]> {
  const t0 = Date.now()
  const admin = createAdminClient()
  const { data } = await admin
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startOfDayISO())
    .lte('created_at', endOfDayISO())
    .order('created_at', { ascending: false })
    .limit(limit)
  console.log(`[ADMIN_PERF] getTodayOrders bid=${businessId.slice(0, 6)}.. ${Date.now() - t0}ms rows=${data?.length ?? 0}`)
  return (data ?? []) as Order[]
}

export async function getNextThirtyMinReservations(businessId: string): Promise<Reservation[]> {
  const t0 = Date.now()
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
  console.log(`[ADMIN_PERF] getNextThirtyMinReservations bid=${businessId.slice(0, 6)}.. ${Date.now() - t0}ms rows=${data?.length ?? 0}`)
  return (data ?? []) as Reservation[]
}

export async function listReservations(
  businessId: string,
  f: ReservationFilterValues = {},
  page = 1,
  pageSize = 50,
): Promise<{ rows: Reservation[]; total: number }> {
  const t0 = Date.now()
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
  console.log(`[ADMIN_PERF] listReservations bid=${businessId.slice(0, 6)}.. page=${page} ${Date.now() - t0}ms rows=${data?.length ?? 0} total=${count ?? 0}`)
  return { rows: (data ?? []) as Reservation[], total: count ?? 0 }
}

export async function listOrders(
  businessId: string,
  f: OrderFilterValues = {},
  page = 1,
  pageSize = 50,
): Promise<{ rows: Order[]; total: number }> {
  const t0 = Date.now()
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
  console.log(`[ADMIN_PERF] listOrders bid=${businessId.slice(0, 6)}.. page=${page} ${Date.now() - t0}ms rows=${data?.length ?? 0} total=${count ?? 0}`)
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
