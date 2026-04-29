import { requireShopCustomer } from '@/lib/shop/auth'
import { createClient } from '@/lib/db/supabase-server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Package, Truck, CheckCircle2, Clock, XCircle, ChevronRight, Banknote, CreditCard } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending:           'Εκκρεμεί',
  awaiting_approval: 'Αναμονή έγκρισης',
  accepted:          'Επιβεβαιώθηκε',
  confirmed:         'Επιβεβαιώθηκε',
  preparing:         'Σε προετοιμασία',
  ready:             'Έτοιμη για παραλαβή',
  dispatched:        'Βρίσκεται σε δρόμο',
  completed:         'Ολοκληρώθηκε',
  delivered:         'Παραδόθηκε',
  cancelled:         'Ακυρώθηκε',
  rejected:          'Απορρίφθηκε',
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': case 'delivered': case 'accepted': case 'confirmed':
      return <CheckCircle2 className="size-5 text-emerald-500" />
    case 'preparing': case 'ready':
      return <Package className="size-5 text-purple-500" />
    case 'dispatched':
      return <Truck className="size-5 text-indigo-500" />
    case 'cancelled': case 'rejected':
      return <XCircle className="size-5 text-red-500" />
    default:
      return <Clock className="size-5 text-amber-500" />
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  cash:       'Μετρητά',
  card:       'Κάρτα',
  apple_pay:  'Apple Pay',
  google_pay: 'Google Pay',
}

const LIVE_STATUSES = ['pending', 'awaiting_approval', 'accepted', 'confirmed', 'preparing', 'ready', 'dispatched']

export default async function OrderDetailPage({
  params,
}: {
  params: { businessId: string; orderId: string }
}) {
  const { businessId, orderId } = params
  const customer = await requireShopCustomer(businessId)

  const admin    = createAdminClient()
  const supabase = createClient()

  const [businessRes, orderRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, primary_color')
      .eq('id', businessId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, menu_item_id, quantity, unit_price, subtotal, notes,
          menu_items ( name_el, name_en, image_url )
        ),
        order_status_history ( status, created_at, note )
      `)
      .eq('id', orderId)
      .eq('business_id', businessId)
      .eq('app_customer_id', customer.id)
      .single(),
  ])

  if (!businessRes.data || !orderRes.data) notFound()

  const order        = orderRes.data
  const primaryColor = businessRes.data.primary_color ?? '#2563eb'

  const history = ((order.order_status_history ?? []) as Array<{ status: string; created_at: string; note: string | null }>)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const isLive       = LIVE_STATUSES.includes(order.status)
  const fulfillment  = order.type as string

  const subtotal       = Number(order.subtotal ?? 0)
  const serviceFee     = Number(order.service_fee ?? 0)
  const deliveryFee    = Number(order.delivery_fee ?? 0)
  const tipAmount      = Number(order.tip_amount ?? 0)
  const couponDiscount = Number(order.coupon_discount ?? 0)
  const orderTotal     = Number(order.total ?? 0)

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader
        businessId={businessId}
        businessName={businessRes.data.name}
        primaryColor={primaryColor}
        customer={{ first_name: customer.first_name, email: customer.email }}
        showBack
        backHref={`/shop/${businessId}/orders`}
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-10">
        {/* Status hero */}
        <div className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
          <div className="flex justify-center">
            <StatusIcon status={order.status} />
          </div>
          <h1 className="text-lg font-bold">{STATUS_LABELS[order.status] ?? order.status}</h1>
          <p className="text-xs text-muted-foreground">
            #{order.id.slice(-6).toUpperCase()} · {formatDateTime(order.created_at)}
          </p>
          {isLive && fulfillment === 'delivery' && (
            <Link
              href={`/portal/${businessId}/track/${orderId}`}
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline mt-1"
              style={{ color: primaryColor }}
            >
              Παρακολουθήστε live <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Items */}
        <section className="rounded-xl border border-border divide-y divide-border">
          <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Προϊόντα
          </div>
          {((order.order_items ?? []) as any[]).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              {item.menu_items?.image_url ? (
                <img
                  src={item.menu_items.image_url}
                  alt={item.menu_items.name_el}
                  className="size-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="size-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-lg">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.menu_items?.name_el ?? '—'}</p>
                {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(item.unit_price) * item.quantity)}</p>
                <p className="text-xs text-muted-foreground">{item.quantity}×</p>
              </div>
            </div>
          ))}
        </section>

        {/* Totals */}
        <section className="rounded-xl bg-muted/40 divide-y divide-border">
          {[
            ['Υποσύνολο', formatCurrency(subtotal)],
            ...(serviceFee > 0 ? [['Χρέωση εφαρμογής', formatCurrency(serviceFee)]] : []),
            ...(fulfillment === 'delivery' ? [['Delivery', deliveryFee === 0 ? 'Δωρεάν' : formatCurrency(deliveryFee)]] : []),
            ...(tipAmount > 0 ? [['Φιλοδώρημα', formatCurrency(tipAmount)]] : []),
            ...(couponDiscount > 0 ? [['Έκπτωση κουπονιού', `-${formatCurrency(couponDiscount)}`]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className={couponDiscount > 0 && label === 'Έκπτωση κουπονιού' ? 'text-emerald-600 font-medium' : ''}>
                {value}
              </span>
            </div>
          ))}
          <div className="flex justify-between px-3 py-3 text-base font-bold">
            <span>Σύνολο</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
        </section>

        {/* Payment method */}
        <section className="rounded-xl border border-border px-4 py-3 flex items-center gap-3">
          {order.payment_method === 'cash'
            ? <Banknote className="size-4 text-muted-foreground" />
            : <CreditCard className="size-4 text-muted-foreground" />}
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Τρόπος πληρωμής</p>
            <p className="text-sm">{PAYMENT_LABELS[order.payment_method ?? 'cash'] ?? order.payment_method}</p>
          </div>
          {order.coupon_code && (
            <>
              <div className="ml-auto text-right">
                <p className="text-xs font-semibold text-muted-foreground">Κουπόνι</p>
                <p className="text-sm font-mono">{order.coupon_code}</p>
              </div>
            </>
          )}
        </section>

        {/* Status history */}
        {history.length > 0 && (
          <section className="rounded-xl border border-border divide-y divide-border">
            <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ιστορικό κατάστασης
            </div>
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 shrink-0">
                  <StatusIcon status={h.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{STATUS_LABELS[h.status] ?? h.status}</p>
                  {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDateTime(h.created_at)}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Notes */}
        {order.delivery_notes && (
          <section className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Σχόλια παραγγελίας</p>
            <p className="text-sm">{order.delivery_notes}</p>
          </section>
        )}

        {order.driver_comment && (
          <section className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Οδηγίες διανομέα</p>
            <p className="text-sm">{order.driver_comment}</p>
          </section>
        )}

        {/* Delivery address */}
        {fulfillment === 'delivery' && order.delivery_address && (
          <section className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Διεύθυνση delivery</p>
            <p className="text-sm">{order.delivery_address}</p>
          </section>
        )}

        {/* Reorder CTA */}
        <Link
          href={`/shop/${businessId}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <Package className="size-4" />
          Νέα παραγγελία
        </Link>
      </main>
    </div>
  )
}
