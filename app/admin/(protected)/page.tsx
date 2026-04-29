import Link from 'next/link'
import { requireAdminSession } from '@/lib/auth/admin-session'
import { StatCard } from '@/components/admin/StatCard'
import { ReservationsTable } from '@/components/admin/ReservationsTable'
import { OrdersTable } from '@/components/admin/OrdersTable'
import {
  getOverviewStats,
  getTodayReservations,
  getTodayOrders,
  getNextThirtyMinReservations,
} from '@/lib/admin/fetchers'
import { eur, formatTimeShort, formatPhone } from '@/lib/admin/formatters'
import { ReferenceTag } from '@/components/admin/ReferenceTag'
import { StatusPill } from '@/components/admin/StatusPill'

export default async function OverviewPage() {
  const { business } = await requireAdminSession()
  const businessId = business.id

  const [stats, todayReservations, todayOrders, nextThirty] = await Promise.all([
    getOverviewStats(businessId),
    getTodayReservations(businessId, 8),
    getTodayOrders(businessId, 8),
    getNextThirtyMinReservations(businessId),
  ])

  return (
    <div className="fade-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="heading-display" style={{ fontSize: 32, margin: 0 }}>Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--ash)' }}>
          {new Intl.DateTimeFormat('el-GR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}
        </p>
      </header>

      <section className="stats-grid" aria-label="Today's metrics">
        <StatCard
          label="Today's reservations"
          value={stats.todayReservations}
          delta={{ value: stats.todayReservationsDelta, suffix: ' vs yesterday', positiveIsGood: true }}
        />
        <StatCard
          label="Today's orders"
          value={stats.todayOrders}
          delta={{ value: stats.todayOrdersDelta, suffix: ' vs yesterday', positiveIsGood: true }}
        />
        <StatCard
          label="Action needed"
          value={stats.pendingReservations + stats.awaitingOrderApprovals}
          hint={
            <span>
              {stats.pendingReservations} confirm · {stats.awaitingOrderApprovals} approve
            </span>
          }
        />
        <StatCard
          label="Today's revenue"
          value={eur(stats.todayRevenue)}
          delta={{ value: stats.todayRevenueDeltaPct, suffix: '%', positiveIsGood: true }}
        />
      </section>

      {nextThirty.length > 0 && (
        <section
          aria-label="Next 30 minutes — pending"
          style={{
            background: 'var(--pending-bg)',
            border: '1px solid rgba(139, 87, 18, 0.18)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pending-ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Next 30 min · still pending
          </span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {nextThirty.slice(0, 5).map((r) => (
              <span key={r.id} style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--pending-ink)' }}>
                <strong>{formatTimeShort(r.reserved_at)}</strong>
                <span>{r.customer_name ?? '—'}</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>{r.party_size} pax</span>
              </span>
            ))}
            {nextThirty.length > 5 && (
              <span style={{ fontSize: 12, color: 'var(--pending-ink)' }}>+{nextThirty.length - 5} more</span>
            )}
          </div>
        </section>
      )}

      <section className="two-col">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--mist)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Today's reservations</h2>
            <Link href="/admin/reservations" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ padding: 12 }}>
            <ReservationsTable rows={todayReservations} variant="today" selectable={false} />
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--mist)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Today's orders</h2>
            <Link href="/admin/orders" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ padding: 12 }}>
            <OrdersTable rows={todayOrders} variant="today" selectable={false} />
          </div>
        </div>
      </section>
    </div>
  )
}
