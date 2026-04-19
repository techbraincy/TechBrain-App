'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/db/supabase-browser'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Truck, MapPin, Phone, User, FileText,
  Check, ChevronRight, Clock, Copy, ExternalLink, Package,
  Navigation, NavigationOff,
} from 'lucide-react'
import type { Order, OrderItem, OrderStatus, BusinessFeatures, DeliveryConfig } from '@/types/db'

type OrderWithItems = Order & {
  order_items: OrderItem[]
  customer: { name: string | null; phone: string | null } | null
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:           'Νέα',
  awaiting_approval: 'Εκκρεμεί',
  accepted:          'Αποδεκτή',
  rejected:          'Απορρίφθηκε',
  preparing:         'Προετοιμασία',
  ready:             'Έτοιμη',
  dispatched:        'Σε δρόμο',
  completed:         'Ολοκληρώθηκε',
  cancelled:         'Ακυρώθηκε',
}

const ACTIVE_STATUSES: OrderStatus[] = ['awaiting_approval', 'accepted', 'preparing', 'ready']
const DISPATCHED_STATUSES: OrderStatus[] = ['dispatched']
const DONE_STATUSES: OrderStatus[] = ['completed']

interface Column {
  id: string
  label: string
  icon: React.ElementType
  color: string
  statuses: OrderStatus[]
}

const COLUMNS: Column[] = [
  { id: 'active',     label: 'Προετοιμασία',  icon: Package, color: 'text-amber-600',   statuses: ACTIVE_STATUSES },
  { id: 'dispatched', label: 'Σε δρόμο',       icon: Truck,   color: 'text-blue-600',    statuses: DISPATCHED_STATUSES },
  { id: 'done',       label: 'Ολοκληρώθηκε',   icon: Check,   color: 'text-emerald-600', statuses: DONE_STATUSES },
]

interface Props {
  businessId:     string
  initialOrders:  OrderWithItems[]
  features:       BusinessFeatures | null
  deliveryConfig: DeliveryConfig | null
  appUrl:         string
}

export function DeliveryClient({ businessId, initialOrders, features, deliveryConfig, appUrl }: Props) {
  const [orders, setOrders]         = useState(initialOrders)
  const [selected, setSelected]     = useState<OrderWithItems | null>(null)
  const [loading, setLoading]       = useState<string | null>(null)
  // GPS tracking: which orderId is currently broadcasting location
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up interval on unmount or when tracking stops
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const sendLocation = useCallback(async (orderId: string) => {
    if (!navigator.geolocation) {
      toast.error('Ο browser δεν υποστηρίζει GPS')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await fetch(`/api/businesses/${businessId}/orders/${orderId}/location`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          })
        } catch {
          // Silent — next interval will retry
        }
      },
      () => toast.error('Δεν επιτράπηκε πρόσβαση στη τοποθεσία'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [businessId])

  function startTracking(orderId: string) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTrackingId(orderId)
    sendLocation(orderId) // send immediately
    intervalRef.current = setInterval(() => sendLocation(orderId), 15000)
    toast.success('Μετάδοση τοποθεσίας ενεργή')
  }

  function stopTracking() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setTrackingId(null)
    toast('Μετάδοση τοποθεσίας σταμάτησε')
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase
      .channel(`delivery:${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as OrderWithItems
            if (newOrder.type === 'delivery') {
              setOrders((prev) => [{ ...newOrder, order_items: [], customer: null }, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Partial<OrderWithItems>
            setOrders((prev) =>
              prev.map((o) => o.id === updated.id ? { ...o, ...updated } as OrderWithItems : o)
            )
            setSelected((s) => (s?.id === updated.id ? { ...s, ...updated } as OrderWithItems : s))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [businessId])

  const updateOrder = useCallback(async (orderId: string, status: OrderStatus) => {
    setLoading(orderId)
    try {
      const res = await fetch(`/api/businesses/${businessId}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...json.order } as OrderWithItems : o))
      if (selected?.id === orderId) setSelected((s) => s ? { ...s, ...json.order } as OrderWithItems : s)
      toast.success(STATUS_LABELS[status])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }, [businessId, selected])

  function copyTrackingLink(reference: string) {
    const url = `${appUrl}/portal/${businessId}/track/${reference.toLowerCase()}`
    navigator.clipboard.writeText(url)
    toast.success('Σύνδεσμος αντιγράφηκε')
  }

  function openMaps(address: string) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank')
  }

  // Stats
  const preparing  = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length
  const dispatched = orders.filter((o) => DISPATCHED_STATUSES.includes(o.status)).length
  const completed  = orders.filter((o) => DONE_STATUSES.includes(o.status)).length

  return (
    <>
      {/* Stat bar */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill label="Προετοιμασία" value={preparing}  color="bg-amber-50 border-amber-200 text-amber-700" />
        <StatPill label="Σε δρόμο"     value={dispatched} color="bg-blue-50 border-blue-200 text-blue-700" />
        <StatPill label="Σήμερα"       value={completed}  color="bg-emerald-50 border-emerald-200 text-emerald-700" />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => col.statuses.includes(o.status))
          const Icon = col.icon
          return (
            <div key={col.id} className="space-y-2">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <Icon className={`size-4 ${col.color}`} />
                <span className="text-sm font-medium">{col.label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-24">
                {colOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border py-8 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Καμία παραγγελία</p>
                  </div>
                )}
                {colOrders.map((order) => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    loading={loading === order.id}
                    deliveryConfig={deliveryConfig}
                    isTracking={trackingId === order.id}
                    onAdvance={() => {
                      const next = nextStatus(order.status)
                      if (next) updateOrder(order.id, next)
                    }}
                    onDetail={() => setSelected(order)}
                    onCopyLink={() => copyTrackingLink(order.reference)}
                    onMaps={() => order.delivery_address && openMaps(order.delivery_address)}
                    onToggleTracking={() =>
                      trackingId === order.id ? stopTracking() : startTracking(order.id)
                    }
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selected.reference}</span>
                <Badge variant="secondary">{STATUS_LABELS[selected.status]}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {selected.customer_name && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span>{selected.customer_name}</span>
                </div>
              )}
              {selected.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${selected.customer_phone}`} className="hover:underline">{selected.customer_phone}</a>
                </div>
              )}
              {selected.delivery_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{selected.delivery_address}</p>
                    <button
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                      onClick={() => openMaps(selected.delivery_address!)}
                    >
                      <ExternalLink className="size-3" /> Άνοιγμα σε Google Maps
                    </button>
                  </div>
                </div>
              )}
              {selected.delivery_notes && (
                <div className="flex items-start gap-2">
                  <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{selected.delivery_notes}</span>
                </div>
              )}

              {selected.order_items?.length > 0 && (
                <div className="rounded-xl border border-border divide-y divide-border">
                  {selected.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2">
                      <span>{item.quantity}× {item.name_el}</span>
                      {item.unit_price > 0 && (
                        <span className="tabular-nums text-muted-foreground">{formatCurrency(item.unit_price * item.quantity)}</span>
                      )}
                    </div>
                  ))}
                  {selected.total > 0 && (
                    <div className="flex justify-between px-3 py-2 font-semibold">
                      <span>Σύνολο</span>
                      <span>{formatCurrency(selected.total)}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">{formatDateTime(selected.created_at)}</p>
            </div>

            <DialogFooter className="flex-row gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => copyTrackingLink(selected.reference)}>
                <Copy className="size-3.5" /> Tracking link
              </Button>
              {selected.delivery_address && (
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => openMaps(selected.delivery_address!)}>
                  <MapPin className="size-3.5" /> Maps
                </Button>
              )}
              {nextStatus(selected.status) && (
                <Button size="sm" className="flex-1 gap-1.5"
                  disabled={loading === selected.id}
                  onClick={() => { const n = nextStatus(selected.status); if (n) updateOrder(selected.id, n) }}>
                  <ChevronRight className="size-4" />
                  {nextLabel(selected.status)}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: Partial<Record<OrderStatus, OrderStatus>> = {
    awaiting_approval: 'accepted',
    accepted:          'preparing',
    preparing:         'dispatched',
    dispatched:        'completed',
  }
  return flow[status] ?? null
}

function nextLabel(status: OrderStatus): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    awaiting_approval: 'Αποδοχή',
    accepted:          'Έναρξη προετοιμασίας',
    preparing:         'Αποστολή',
    dispatched:        'Ολοκλήρωση',
  }
  return labels[status] ?? 'Επόμενο'
}

function etaMinutes(order: Order, deliveryConfig: DeliveryConfig | null): number | null {
  if (order.status !== 'dispatched') return null
  const dispatchedAt = order.updated_at ? new Date(order.updated_at).getTime() : null
  if (!dispatchedAt) return null
  const estimatedMs = (deliveryConfig?.estimated_minutes ?? 45) * 60 * 1000
  const eta = Math.round((dispatchedAt + estimatedMs - Date.now()) / 60000)
  return eta
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${color}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  )
}

function DeliveryCard({
  order, loading, deliveryConfig, isTracking,
  onAdvance, onDetail, onCopyLink, onMaps, onToggleTracking,
}: {
  order: OrderWithItems
  loading: boolean
  deliveryConfig: DeliveryConfig | null
  isTracking: boolean
  onAdvance: () => void
  onDetail: () => void
  onCopyLink: () => void
  onMaps: () => void
  onToggleTracking: () => void
}) {
  const eta = etaMinutes(order, deliveryConfig)
  const isLate = eta !== null && eta < 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold tabular-nums">{order.reference}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="size-3" />
              {new Date(order.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {/* ETA badge for dispatched */}
          {order.status === 'dispatched' && eta !== null && (
            <span className={`text-xs font-medium rounded-full px-2 py-0.5 border ${
              isLate
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {isLate ? `+${Math.abs(eta)} λεπτά καθυστέρηση` : `~${eta} λεπτά`}
            </span>
          )}
          {order.status === 'dispatched' && eta === null && (
            <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">
              ~{deliveryConfig?.estimated_minutes ?? 45} λεπτά
            </span>
          )}
        </div>

        {/* Customer */}
        {order.customer_name && (
          <p className="text-sm truncate flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground shrink-0" />
            {order.customer_name}
          </p>
        )}

        {/* Address */}
        {order.delivery_address && (
          <button
            onClick={onMaps}
            className="text-xs text-left text-muted-foreground hover:text-primary flex items-start gap-1.5 w-full"
          >
            <MapPin className="size-3.5 shrink-0 mt-0.5" />
            <span className="truncate">{order.delivery_address}</span>
            <ExternalLink className="size-3 shrink-0 mt-0.5" />
          </button>
        )}

        {/* Items count */}
        {order.order_items?.length > 0 && (
          <p className="text-xs text-muted-foreground">{order.order_items.length} είδη</p>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={onDetail}>
            <FileText className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={onCopyLink}
            title="Αντιγραφή tracking link">
            <Copy className="size-3.5" />
          </Button>
          {/* GPS share button — only shown for dispatched orders */}
          {order.status === 'dispatched' && (
            <Button
              size="icon"
              variant="ghost"
              className={`size-7 shrink-0 ${isTracking ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground'}`}
              onClick={onToggleTracking}
              title={isTracking ? 'Διακοπή GPS' : 'Μετάδοση τοποθεσίας'}
            >
              {isTracking
                ? <Navigation className="size-3.5 animate-pulse" />
                : <NavigationOff className="size-3.5" />
              }
            </Button>
          )}
          {nextStatus(order.status) && (
            <Button size="sm" className="flex-1 h-7 text-xs gap-1" disabled={loading} onClick={onAdvance}>
              <ChevronRight className="size-3.5" />
              {nextLabel(order.status)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
