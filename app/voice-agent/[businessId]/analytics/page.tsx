import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, CalendarDays, Users, TrendingUp, PhoneCall } from 'lucide-react'

interface Props { params: { businessId: string } }

export default async function AnalyticsPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId)
  const supabase = createClient()

  const now     = new Date()
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: todayOrders },
    { data: monthOrders },
    { data: todayRes },
    { data: monthRes },
    { data: totalCustomers },
    { data: callLogs },
  ] = await Promise.all([
    supabase.from('orders').select('total, status').eq('business_id', params.businessId).gte('created_at', todayStart),
    supabase.from('orders').select('total, status').eq('business_id', params.businessId).gte('created_at', monthStart),
    supabase.from('reservations').select('id, status').eq('business_id', params.businessId).gte('created_at', todayStart),
    supabase.from('reservations').select('id, status').eq('business_id', params.businessId).gte('created_at', monthStart),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', params.businessId),
    supabase.from('call_logs').select('id, outcome, duration_seconds').eq('business_id', params.businessId).gte('created_at', monthStart),
  ])

  const completed = (orders: any[]) => orders?.filter((o) => o.status === 'completed') ?? []
  const revenue   = (orders: any[]) => completed(orders).reduce((s, o) => s + Number(o.total ?? 0), 0)

  const stats = [
    {
      title: 'Παραγγελίες σήμερα',
      value: todayOrders?.length ?? 0,
      sub: `${completed(todayOrders ?? []).length} ολοκληρωμένες`,
      icon: ShoppingBag,
      show: business.features?.orders_enabled,
    },
    {
      title: 'Έσοδα μήνα',
      value: formatCurrency(revenue(monthOrders ?? [])),
      sub: `${monthOrders?.length ?? 0} παραγγελίες`,
      icon: TrendingUp,
      show: business.features?.orders_enabled,
    },
    {
      title: 'Κρατήσεις σήμερα',
      value: todayRes?.length ?? 0,
      sub: `${monthRes?.length ?? 0} τον μήνα`,
      icon: CalendarDays,
      show: business.features?.reservations_enabled,
    },
    {
      title: 'Σύνολο πελατών',
      value: totalCustomers?.length ?? '—',
      sub: 'Από όλες τις κλήσεις',
      icon: Users,
      show: true,
    },
    {
      title: 'Κλήσεις μήνα',
      value: callLogs?.length ?? 0,
      sub: callLogs?.length
        ? `Μέσος χρόνος: ${Math.round((callLogs.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / callLogs.length) / 60)}΄`
        : 'Καμία ακόμα',
      icon: PhoneCall,
      show: true,
    },
  ].filter((s) => s.show)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Στατιστικά</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="size-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order status breakdown */}
      {business.features?.orders_enabled && monthOrders && monthOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Παραγγελίες μήνα — κατανομή</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderBreakdown orders={monthOrders} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function OrderBreakdown({ orders }: { orders: { status: string; total: number }[] }) {
  const groups: Record<string, number> = {}
  for (const o of orders) {
    groups[o.status] = (groups[o.status] ?? 0) + 1
  }
  const labels: Record<string, string> = {
    completed:         'Ολοκληρωμένες',
    cancelled:         'Ακυρωμένες',
    rejected:          'Απορριφθείσες',
    awaiting_approval: 'Εκκρεμείς',
    preparing:         'Σε προετοιμασία',
    ready:             'Έτοιμες',
    dispatched:        'Αποστολή',
    accepted:          'Αποδεκτές',
    pending:           'Νέες',
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Object.entries(groups).map(([status, count]) => (
        <div key={status} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{labels[status] ?? status}</span>
          <span className="font-semibold tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  )
}
