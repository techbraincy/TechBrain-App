import { requireShopCustomer } from '@/lib/shop/auth'
import { createClient } from '@/lib/db/supabase-server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending:           'Εκκρεμεί',
  awaiting_approval: 'Αναμονή έγκρισης',
  accepted:          'Επιβεβαιώθηκε',
  confirmed:         'Επιβεβαιώθηκε',
  preparing:         'Προετοιμασία',
  ready:             'Έτοιμη',
  dispatched:        'Σε δρόμο',
  completed:         'Ολοκληρώθηκε',
  delivered:         'Παραδόθηκε',
  cancelled:         'Ακυρώθηκε',
  rejected:          'Απορρίφθηκε',
}

const STATUS_COLORS: Record<string, string> = {
  pending:           'text-amber-600 bg-amber-50',
  awaiting_approval: 'text-amber-600 bg-amber-50',
  accepted:          'text-blue-600 bg-blue-50',
  confirmed:         'text-blue-600 bg-blue-50',
  preparing:         'text-purple-600 bg-purple-50',
  ready:             'text-indigo-600 bg-indigo-50',
  dispatched:        'text-indigo-600 bg-indigo-50',
  completed:         'text-emerald-600 bg-emerald-50',
  delivered:         'text-emerald-600 bg-emerald-50',
  cancelled:         'text-red-600 bg-red-50',
  rejected:          'text-red-600 bg-red-50',
}

export default async function OrdersPage({ params }: { params: { businessId: string } }) {
  const customer = await requireShopCustomer(params.businessId)

  const admin    = createAdminClient()
  const supabase = createClient()

  const [businessRes, ordersRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, primary_color')
      .eq('id', params.businessId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('orders')
      .select('id, status, total, type, created_at')
      .eq('business_id', params.businessId)
      .eq('app_customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!businessRes.data) notFound()

  const orders       = ordersRes.data ?? []
  const primaryColor = businessRes.data.primary_color ?? '#2563eb'

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader
        businessId={params.businessId}
        businessName={businessRes.data.name}
        primaryColor={primaryColor}
        customer={{ first_name: customer.first_name, email: customer.email }}
        showBack
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <h1 className="text-lg font-bold">Οι παραγγελίες μου</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package className="size-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Δεν έχετε κάνει ακόμα παραγγελία.</p>
            <Link
              href={`/shop/${params.businessId}`}
              className="text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Παραγγείλτε τώρα →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const fulfillment = order.type as string
              return (
                <Link
                  key={order.id}
                  href={`/shop/${params.businessId}/orders/${order.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className="size-10 rounded-lg shrink-0 flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Package className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        #{order.id.slice(-6).toUpperCase()}
                        {fulfillment === 'delivery' ? ' · Delivery' : ' · Takeaway'}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[order.status] ?? 'text-muted-foreground bg-muted'}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(order.created_at)}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(order.total ?? 0))}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
