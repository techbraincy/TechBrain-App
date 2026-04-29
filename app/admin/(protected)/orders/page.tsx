import { requireAdminSession } from '@/lib/auth/admin-session'
import { OrderFilters } from '@/components/admin/OrderFilters'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { listOrders } from '@/lib/admin/fetchers'
import type { OrderFilterValues, OrderStatus, OrderType, OrderSource } from '@/lib/admin/types'

interface Props {
  searchParams: { [k: string]: string | string[] | undefined }
}

export default async function OrdersPage({ searchParams }: Props) {
  const { business } = await requireAdminSession()

  const filters: OrderFilterValues = {
    from: typeof searchParams.from === 'string' ? searchParams.from : undefined,
    to: typeof searchParams.to === 'string' ? searchParams.to : undefined,
    status: (searchParams.status as OrderStatus | 'all' | undefined) ?? undefined,
    type: (searchParams.type as OrderType | 'all' | undefined) ?? undefined,
    source: (searchParams.source as OrderSource | 'all' | undefined) ?? undefined,
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
  }

  const { rows, total } = await listOrders(business.id, filters, 1, 50)

  return (
    <div className="fade-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="heading-display" style={{ fontSize: 28, margin: 0 }}>Orders</h1>
        <span style={{ fontSize: 13, color: 'var(--ash)' }}>
          {rows.length} of {total}
        </span>
      </header>

      <OrderFilters />

      <div>
        <OrdersTable rows={rows} variant="full" />
      </div>
    </div>
  )
}
