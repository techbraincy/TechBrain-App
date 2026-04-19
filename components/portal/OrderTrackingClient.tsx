'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/db/supabase-browser'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import {
  Clock, Check, X, Package, Truck, ShoppingBag,
  CalendarDays, Users, WifiOff, MapPin, Navigation,
} from 'lucide-react'
import Link from 'next/link'
import type { Order, OrderItem, OrderStatus, ReservationStatus } from '@/types/db'

// Leaflet map — dynamically imported to avoid Next.js SSR issues
const LiveMap = dynamic(() => import('@/components/portal/LiveMap'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 animate-pulse rounded-xl">
      <MapPin className="size-6 text-muted-foreground/40" />
    </div>
  ),
})

// ----------------------------------------------------------------
const ORDER_STEPS: Array<{ status: OrderStatus; label: string; icon: React.ElementType }> = [
  { status: 'pending',           label: 'Ελήφθη',        icon: Clock },
  { status: 'awaiting_approval', label: 'Αναμονή',        icon: Clock },
  { status: 'accepted',          label: 'Αποδεκτή',       icon: Check },
  { status: 'preparing',         label: 'Προετοιμασία',   icon: Package },
  { status: 'ready',             label: 'Έτοιμη',         icon: ShoppingBag },
  { status: 'dispatched',        label: 'Σε δρόμο',       icon: Truck },
  { status: 'completed',         label: 'Ολοκληρώθηκε',   icon: Check },
]

const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'rejected']
// Statuses where the map is shown for delivery orders
const MAP_STATUSES: OrderStatus[]      = ['preparing', 'ready', 'dispatched']

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:           'Ελήφθη',
  awaiting_approval: 'Αναμένει έγκριση',
  accepted:          'Αποδεκτή',
  rejected:          'Απορρίφθηκε',
  preparing:         'Σε προετοιμασία',
  ready:             'Έτοιμη για παραλαβή',
  dispatched:        'Σε δρόμο',
  completed:         'Ολοκληρώθηκε',
  cancelled:         'Ακυρώθηκε',
}

const RES_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:   'Αναμένει επιβεβαίωση',
  confirmed: 'Επιβεβαιωμένη',
  rejected:  'Απορρίφθηκε',
  completed: 'Ολοκληρώθηκε',
  no_show:   'Δεν εμφανίστηκε',
  cancelled: 'Ακυρώθηκε',
}

interface Props {
  record:            any
  type:              'order' | 'reservation'
  pickupCoords:      [number, number] | null
  destinationCoords: [number, number] | null
}

export function OrderTrackingClient({ record: initial, type, pickupCoords, destinationCoords }: Props) {
  const [record, setRecord]     = useState(initial)
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const table    = type === 'order' ? 'orders' : 'reservations'

    const channel = supabase
      .channel(`track-${record.id}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table,
        filter: `id=eq.${record.id}`,
      }, (payload) => {
        setRecord((prev: any) => ({ ...prev, ...payload.new }))
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [record.id, type])

  const biz = record.business
  if (type === 'reservation') return <ReservationTracking res={record} biz={biz} />
  return (
    <OrderTracking
      order={record}
      biz={biz}
      connected={connected}
      pickupCoords={pickupCoords}
      destinationCoords={destinationCoords}
    />
  )
}

// ----------------------------------------------------------------
function OrderTracking({
  order, biz, connected, pickupCoords, destinationCoords,
}: {
  order: any
  biz: any
  connected: boolean
  pickupCoords: [number, number] | null
  destinationCoords: [number, number] | null
}) {
  const status     = order.status as OrderStatus
  const isTerminal = TERMINAL_STATUSES.includes(status)
  const isFailed   = status === 'cancelled' || status === 'rejected'
  const isDelivery = order.type === 'delivery'
  const showMap    = isDelivery && MAP_STATUSES.includes(status)

  const driverCoords: [number, number] | null =
    order.driver_lat != null && order.driver_lng != null
      ? [order.driver_lat, order.driver_lng]
      : null

  // Minutes since driver location was last updated
  const locationAge = order.driver_updated_at
    ? Math.round((Date.now() - new Date(order.driver_updated_at).getTime()) / 60000)
    : null

  const stepsToShow = isDelivery
    ? ORDER_STEPS.filter((s) => s.status !== 'ready')
    : ORDER_STEPS.filter((s) => s.status !== 'dispatched')

  const currentIdx = stepsToShow.findIndex((s) => s.status === status)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/portal/${order.business_id}`} className="text-muted-foreground hover:text-foreground">
            ←
          </Link>
          <div
            className="flex size-8 items-center justify-center rounded-lg text-white text-xs font-bold"
            style={{ backgroundColor: biz?.primary_color ?? '#6366f1' }}
          >
            {biz?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="font-semibold text-sm">{biz?.name}</span>
        </div>
        {/* Connection status */}
        {!connected && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <WifiOff className="size-3" /> Εκτός σύνδεσης
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-6 py-8 space-y-6">
        {/* Reference + status headline */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-mono">{order.reference}</p>
          <h1 className={cn('text-xl font-semibold', isFailed && 'text-destructive')}>
            {STATUS_LABELS[status]}
          </h1>
          {order.rejection_reason && (
            <p className="text-sm text-muted-foreground">{order.rejection_reason}</p>
          )}
          {order.estimated_minutes && !isTerminal && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="size-4" /> ~{order.estimated_minutes} λεπτά
            </p>
          )}
        </div>

        {/* ── LIVE MAP ──────────────────────────────────────────── */}
        {showMap && (
          <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 280 }}>
            {driverCoords ? (
              <>
                <LiveMap
                  pickupCoords={pickupCoords}
                  destinationCoords={destinationCoords}
                  driverCoords={driverCoords}
                  primaryColor={biz?.primary_color ?? '#6366f1'}
                />
              </>
            ) : (
              /* No location yet — show friendly fallback */
              <div className="h-full flex flex-col items-center justify-center bg-muted/20 text-center p-6 gap-3">
                <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Navigation className="size-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Αναμονή τοποθεσίας</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ο διανομέας δεν έχει ξεκινήσει ακόμα
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map legend + location age when driver is active */}
        {showMap && driverCoords && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full inline-block" style={{ background: biz?.primary_color ?? '#6366f1' }} />
              Κατάστημα
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500 inline-block" />
              Διανομέας
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-600 inline-block" />
              Εσείς
            </span>
            {locationAge !== null && (
              <span className="ml-auto">
                {locationAge === 0 ? 'Μόλις τώρα' : `${locationAge} λεπτά πριν`}
              </span>
            )}
          </div>
        )}

        {/* Progress timeline */}
        {!isFailed && (
          <div className="space-y-0">
            {stepsToShow.map((step, idx) => {
              const done    = idx < currentIdx
              const current = idx === currentIdx
              const future  = idx > currentIdx
              return (
                <div key={step.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      done    ? 'border-emerald-500 bg-emerald-500 text-white'
                      : current ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-muted-foreground'
                    )}>
                      {done ? <Check className="size-4" /> : <step.icon className="size-4" />}
                    </div>
                    {idx < stepsToShow.length - 1 && (
                      <div className={cn('w-0.5 flex-1 my-1', done ? 'bg-emerald-500' : 'bg-border')} />
                    )}
                  </div>
                  <div className="pb-6 pt-1">
                    <p className={cn('text-sm font-medium', future && 'text-muted-foreground')}>
                      {step.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Completed celebration */}
        {status === 'completed' && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-1">
            <div className="text-3xl">🎉</div>
            <p className="font-semibold text-emerald-800">Η παραγγελία σας παραδόθηκε!</p>
            <p className="text-sm text-emerald-700">Καλή απόλαυση!</p>
          </div>
        )}

        {/* Order items */}
        {order.order_items?.length > 0 && (
          <div className="rounded-xl border border-border divide-y divide-border">
            {order.order_items.map((item: OrderItem) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{item.quantity}× {item.name_el}</span>
                {item.unit_price > 0 && (
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                )}
              </div>
            ))}
            {order.total > 0 && (
              <div className="flex justify-between px-4 py-2.5 text-sm font-semibold">
                <span>Σύνολο</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            )}
          </div>
        )}

        {/* Delivery address */}
        {order.delivery_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 mt-0.5" />
            <span>{order.delivery_address}</span>
          </div>
        )}

        {biz?.phone && (
          <p className="text-center text-xs text-muted-foreground">
            Ερώτηση;{' '}
            <a href={`tel:${biz.phone}`} className="text-primary hover:underline font-medium">
              Καλέστε μας
            </a>
          </p>
        )}
      </main>
    </div>
  )
}

// ----------------------------------------------------------------
function ReservationTracking({ res, biz }: { res: any; biz: any }) {
  const status = res.status as ReservationStatus

  const statusColors: Record<ReservationStatus, string> = {
    pending:   'text-amber-600',
    confirmed: 'text-emerald-600',
    rejected:  'text-destructive',
    completed: 'text-muted-foreground',
    no_show:   'text-muted-foreground',
    cancelled: 'text-destructive',
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/portal/${res.business_id}`} className="text-muted-foreground hover:text-foreground">←</Link>
        <div className="flex size-8 items-center justify-center rounded-lg text-white text-xs font-bold"
          style={{ backgroundColor: biz?.primary_color ?? '#6366f1' }}>
          {biz?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="font-semibold text-sm">{biz?.name}</span>
      </header>

      <main className="max-w-sm mx-auto px-6 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <CalendarDays className="size-8 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-mono">{res.reference}</p>
          <h1 className={cn('text-xl font-semibold', statusColors[status])}>
            {RES_STATUS_LABELS[status]}
          </h1>
          {res.rejection_reason && <p className="text-sm text-muted-foreground">{res.rejection_reason}</p>}
        </div>

        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <CalendarDays className="size-4 text-muted-foreground shrink-0" />
            <span>{formatDateTime(res.reserved_at)}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <span>{res.party_size} άτομα</span>
          </div>
          {res.customer_name && (
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground w-4 text-center text-xs">👤</span>
              <span>{res.customer_name}</span>
            </div>
          )}
          {res.notes && (
            <div className="px-4 py-3 text-sm text-muted-foreground">{res.notes}</div>
          )}
        </div>

        {biz?.phone && (
          <p className="text-center text-xs text-muted-foreground">
            Θέλετε να αλλάξετε ή να ακυρώσετε;{' '}
            <a href={`tel:${biz.phone}`} className="text-primary hover:underline font-medium">Καλέστε μας</a>
          </p>
        )}
      </main>
    </div>
  )
}
