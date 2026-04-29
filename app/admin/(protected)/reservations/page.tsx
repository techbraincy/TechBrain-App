import { requireAdminSession } from '@/lib/auth/admin-session'
import { ReservationFilters } from '@/components/admin/ReservationFilters'
import { ReservationsTable } from '@/components/admin/ReservationsTable'
import { listReservations } from '@/lib/admin/fetchers'
import type {
  ReservationFilterValues,
  ReservationStatus,
  ReservationSource,
} from '@/lib/admin/types'

interface Props {
  searchParams: { [k: string]: string | string[] | undefined }
}

export default async function ReservationsPage({ searchParams }: Props) {
  const t0 = Date.now()
  const { business } = await requireAdminSession()

  const filters: ReservationFilterValues = {
    from: typeof searchParams.from === 'string' ? searchParams.from : undefined,
    to: typeof searchParams.to === 'string' ? searchParams.to : undefined,
    status: (searchParams.status as ReservationStatus | 'all' | undefined) ?? undefined,
    source: (searchParams.source as ReservationSource | 'all' | undefined) ?? undefined,
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
  }

  const { rows, total } = await listReservations(business.id, filters, 1, 50)
  console.log(`[ADMIN_PERF] PAGE /admin/reservations total=${Date.now() - t0}ms`)

  return (
    <div className="fade-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="heading-display" style={{ fontSize: 28, margin: 0 }}>Reservations</h1>
        <span style={{ fontSize: 13, color: 'var(--ash)' }}>
          {rows.length} of {total}
        </span>
      </header>

      <ReservationFilters />

      <div>
        <ReservationsTable rows={rows} variant="full" />
      </div>
    </div>
  )
}
