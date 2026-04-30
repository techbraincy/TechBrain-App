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
import { eur, formatTimeShort } from '@/lib/admin/formatters'

export default async function OverviewPage() {
  const { business } = await requireAdminSession()
  const businessId = business.id

  const [stats, todayReservations, todayOrders, nextThirty] = await Promise.all([
    getOverviewStats(businessId),
    getTodayReservations(businessId, 8),
    getTodayOrders(businessId, 8),
    getNextThirtyMinReservations(businessId),
  ])

  const dateLabel = new Intl.DateTimeFormat('el-GR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())

  return (
    <div className="fade-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 72 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="eyebrow">{dateLabel}</span>
        <h1 className="heading-display" style={{ fontSize: 'clamp(36px, 4.5vw, 48px)', margin: 0, lineHeight: 1.05 }}>
          Overview
        </h1>
      </header>

      <section
        className="stats-grid"
        aria-label="Today's metrics"
        style={{
          borderTop: '1px solid var(--mist)',
          borderBottom: '1px solid var(--mist)',
          padding: '36px 0',
        }}
      >
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
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingBottom: 8,
          }}
        >
          <span className="eyebrow" style={{ color: 'var(--pending-ink)' }}>
            Next 30 min · still pending
          </span>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {nextThirty.slice(0, 5).map((r) => (
              <span
                key={r.id}
                style={{
                  display: 'inline-flex',
                  gap: 8,
                  alignItems: 'baseline',
                  fontSize: 13,
                  color: 'var(--ink)',
                  letterSpacing: '0.005em',
                }}
              >
                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatTimeShort(r.reserved_at)}
                </strong>
                <span style={{ color: 'var(--charcoal)' }}>{r.customer_name ?? '—'}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ color: 'var(--ash)' }}>{r.party_size} pax</span>
              </span>
            ))}
            {nextThirty.length > 5 && (
              <span style={{ fontSize: 12, color: 'var(--ash)' }}>+{nextThirty.length - 5} more</span>
            )}
          </div>
        </section>
      )}

      <section className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">Today</span>
              <h2
                className="heading-display"
                style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}
              >
                Reservations
              </h2>
            </div>
            <Link
              href="/admin/reservations"
              style={{
                fontSize: 10,
                color: 'var(--ash)',
                textDecoration: 'none',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 600,
                borderBottom: '1px solid var(--mist)',
                paddingBottom: 1,
              }}
            >
              View all
            </Link>
          </div>
          <ReservationsTable rows={todayReservations} variant="today" selectable={false} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">Today</span>
              <h2
                className="heading-display"
                style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}
              >
                Orders
              </h2>
            </div>
            <Link
              href="/admin/orders"
              style={{
                fontSize: 10,
                color: 'var(--ash)',
                textDecoration: 'none',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 600,
                borderBottom: '1px solid var(--mist)',
                paddingBottom: 1,
              }}
            >
              View all
            </Link>
          </div>
          <OrdersTable rows={todayOrders} variant="today" selectable={false} />
        </div>
      </section>
    </div>
  )
}
