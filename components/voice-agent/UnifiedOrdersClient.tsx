'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Check, X, ChevronRight, ShoppingBag, Clock, Truck,
  Phone, User, MapPin, FileText, CreditCard, Banknote,
  Tag, MessageSquare, Smartphone, Users,
} from 'lucide-react'
import type { Order, OrderItem, OrderStatus, BusinessFeatures } from '@/types/db'

type UnifiedOrder = Order & {
  order_items: (OrderItem & { menu_items?: { name_el: string; image_url: string | null } | null })[]
  customer: { name: string | null; phone: string | null } | null
  order_status_history?: { status: string; created_at: string; note: string | null }[]
}

const STATUS_LABELS: Record<string, string> = {
  pending:           'Νέα',
  awaiting_approval: 'Εκκρεμεί',
  accepted:          'Αποδεκτή',
  rejected:          'Απορρίφθηκε',
  preparing:         'Προετοιμασία',
  ready:             'Έτοιμη',
  dispatched:        'Αποστολή',
  completed:         'Ολοκληρώθηκε',
  cancelled:         'Ακυρώθηκε',
}

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary' | 'info'> = {
  pending:           'warning',
  awaiting_approval: 'warning',
  accepted:          'info',
  rejected:          'destructive',
  preparing:         'info',
  ready:             'success',
  dispatched:        'info',
  completed:         'success',
  cancelled:         'secondary',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Μετρητά', card: 'Κάρτα',
  apple_pay: 'Apple Pay', google_pay: 'Google Pay',
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'awaiting_approval', 'accepted', 'preparing', 'ready', 'dispatched']

function sourceLabel(order: UnifiedOrder): { icon: React.ReactNode; label: string } {
  if (order.app_customer_id || order.source === 'portal') {
    return { icon: <Smartphone className="size-3" />, label: 'App' }
  }
  if (order.source === 'staff') {
    return { icon: <Users className="size-3" />, label: 'Staff' }
  }
  return { icon: <Phone className="size-3" />, label: 'Phone' }
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Props {
  businessId:    string
  initialOrders: UnifiedOrder[]
  features:      BusinessFeatures | null
}

export function UnifiedOrdersClient({ businessId, initialOrders, features }: Props) {
  const [orders,       setOrders]       = useState<UnifiedOrder[]>(initialOrders)
  const [selected,     setSelected]     = useState<UnifiedOrder | null>(null)
  const [rejecting,    setRejecting]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading,      setLoading]      = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`unified-orders-${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const o = payload.new as UnifiedOrder
            setOrders((prev) => [{ ...o, order_items: [], customer: null }, ...prev])
            toast.info('Νέα παραγγελία!')
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Partial<UnifiedOrder>
            setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...(updated as UnifiedOrder) } : o))
            if (selected?.id === updated.id) setSelected((s) => s ? { ...s, ...(updated as UnifiedOrder) } : s)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [businessId, selected])

  const updateOrder = useCallback(async (orderId: string, status: OrderStatus, extra?: Record<string, unknown>) => {
    setLoading(orderId)
    try {
      const res  = await fetch(`/api/businesses/${businessId}/orders/${orderId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...json.order } : o))
      if (selected?.id === orderId) setSelected((s) => s ? { ...s, ...json.order } : s)
      toast.success(`Παραγγελία → ${STATUS_LABELS[status]}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }, [businessId, selected])

  async function handleReject(orderId: string) {
    await updateOrder(orderId, 'rejected', { rejection_reason: rejectReason })
    setRejecting(false)
    setRejectReason('')
    setSelected(null)
  }

  const active    = orders.filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus))
  const completed = orders.filter((o) => o.status === 'completed')
  const cancelled = orders.filter((o) => ['cancelled', 'rejected'].includes(o.status))

  return (
    <>
      {/* Pending approvals alert */}
      {active.filter((o) => o.status === 'awaiting_approval').length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="size-4 shrink-0" />
          <span>
            <strong>{active.filter((o) => o.status === 'awaiting_approval').length}</strong> παραγγελίες αναμένουν έγκριση
          </span>
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Ενεργές
            {active.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Ολοκληρωμένες</TabsTrigger>
          <TabsTrigger value="cancelled">Ακυρωμένες</TabsTrigger>
        </TabsList>

        {[
          { key: 'active',    list: active },
          { key: 'completed', list: completed },
          { key: 'cancelled', list: cancelled },
        ].map(({ key, list }) => (
          <TabsContent key={key} value={key} className="mt-4">
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                <ShoppingBag className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Καμία παραγγελία</p>
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    loading={loading === order.id}
                    onSelect={() => setSelected(order)}
                    onAccept={() => updateOrder(order.id, 'accepted')}
                    onPrepare={() => updateOrder(order.id, 'preparing')}
                    onReady={() => updateOrder(order.id, 'ready')}
                    onDispatch={() => updateOrder(order.id, 'dispatched')}
                    onComplete={() => updateOrder(order.id, 'completed')}
                    onReject={() => { setSelected(order); setRejecting(true) }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selected && !rejecting} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {sourceLabel(selected).icon}
                  <span className="font-mono text-sm">
                    {selected.reference ?? `#${selected.id.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {sourceLabel(selected).label}
                  </span>
                </div>
                <Badge variant={STATUS_VARIANT[selected.status] ?? 'secondary'}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Customer */}
              <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                {selected.customer_name && (
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{selected.customer_name}</span>
                  </div>
                )}
                {selected.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${selected.customer_phone}`} className="hover:underline text-primary">
                      {selected.customer_phone}
                    </a>
                  </div>
                )}
                {selected.delivery_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{selected.delivery_address}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              {(selected.order_items?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-border divide-y divide-border">
                  {selected.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span>{item.quantity}× {item.name_el}</span>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </div>
                      {item.unit_price > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Fee breakdown */}
              <div className="rounded-xl bg-muted/30 divide-y divide-border">
                {[
                  ['Υποσύνολο', formatCurrency(Number(selected.subtotal ?? selected.total ?? 0))],
                  ...(Number(selected.service_fee) > 0 ? [['Χρέωση εφαρμογής', formatCurrency(Number(selected.service_fee))]] : []),
                  ...(Number(selected.delivery_fee) > 0 || selected.type === 'delivery' ? [['Delivery', Number(selected.delivery_fee) === 0 ? 'Δωρεάν' : formatCurrency(Number(selected.delivery_fee))]] : []),
                  ...(Number(selected.tip_amount) > 0 ? [['Φιλοδώρημα', formatCurrency(Number(selected.tip_amount))]] : []),
                  ...(Number(selected.coupon_discount) > 0 ? [['Έκπτωση', `-${formatCurrency(Number(selected.coupon_discount))}`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 font-bold">
                  <span>Σύνολο</span>
                  <span>{formatCurrency(Number(selected.total ?? 0))}</span>
                </div>
              </div>

              {/* Payment + coupon */}
              {(selected.payment_method || selected.coupon_code) && (
                <div className="flex items-center gap-4">
                  {selected.payment_method && (
                    <div className="flex items-center gap-2">
                      {selected.payment_method === 'cash'
                        ? <Banknote className="size-3.5 text-muted-foreground" />
                        : <CreditCard className="size-3.5 text-muted-foreground" />}
                      <span className="text-muted-foreground">
                        {PAYMENT_LABELS[selected.payment_method] ?? selected.payment_method}
                      </span>
                    </div>
                  )}
                  {selected.coupon_code && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Tag className="size-3.5 text-emerald-600" />
                      <span className="font-mono text-xs text-emerald-700 font-semibold">{selected.coupon_code}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selected.delivery_notes && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <FileText className="size-3.5 shrink-0 mt-0.5" />
                  <span>{selected.delivery_notes}</span>
                </div>
              )}
              {selected.driver_comment && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MessageSquare className="size-3.5 shrink-0 mt-0.5" />
                  <span className="italic">{selected.driver_comment}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{formatDateTime(selected.created_at)}</p>
            </div>

            <DialogFooter className="flex-row gap-2 flex-wrap">
              {selected.status === 'awaiting_approval' && (
                <>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => setRejecting(true)}>
                    <X className="size-4 mr-1" /> Απόρριψη
                  </Button>
                  <Button size="sm" className="flex-1" disabled={!!loading}
                    onClick={() => updateOrder(selected.id, 'accepted')}>
                    <Check className="size-4 mr-1" /> Αποδοχή
                  </Button>
                </>
              )}
              {selected.status === 'pending' && (
                <Button size="sm" className="flex-1" disabled={!!loading}
                  onClick={() => updateOrder(selected.id, 'accepted')}>
                  <Check className="size-4 mr-1" /> Αποδοχή
                </Button>
              )}
              {selected.status === 'accepted' && (
                <Button size="sm" className="flex-1" disabled={!!loading}
                  onClick={() => updateOrder(selected.id, 'preparing')}>
                  Έναρξη προετοιμασίας <ChevronRight className="size-4 ml-1" />
                </Button>
              )}
              {selected.status === 'preparing' && (
                <Button size="sm" className="flex-1" disabled={!!loading}
                  onClick={() => updateOrder(selected.id, selected.type === 'delivery' ? 'dispatched' : 'ready')}>
                  {selected.type === 'delivery' ? 'Αποστολή' : 'Έτοιμο'} <ChevronRight className="size-4 ml-1" />
                </Button>
              )}
              {(selected.status === 'ready' || selected.status === 'dispatched') && (
                <Button size="sm" className="flex-1" disabled={!!loading}
                  onClick={() => updateOrder(selected.id, 'completed')}>
                  <Check className="size-4 mr-1" /> Ολοκλήρωση
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejecting} onOpenChange={(o) => { if (!o) { setRejecting(false); setRejectReason('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Απόρριψη παραγγελίας</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selected?.reference ?? `#${selected?.id.slice(-6).toUpperCase()}`}
            </p>
            <div className="space-y-1.5">
              <Label>Αιτία (προαιρετικό)</Label>
              <Input
                placeholder="π.χ. Δεν υπάρχει διαθεσιμότητα"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setRejecting(false); setRejectReason('') }}>
              Ακύρωση
            </Button>
            <Button variant="destructive" size="sm" disabled={!!loading}
              onClick={() => selected && handleReject(selected.id)}>
              Απόρριψη
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function OrderRow({
  order, loading, onSelect, onAccept, onPrepare, onReady, onDispatch, onComplete, onReject,
}: {
  order: UnifiedOrder
  loading: boolean
  onSelect: () => void
  onAccept: () => void
  onPrepare: () => void
  onReady: () => void
  onDispatch: () => void
  onComplete: () => void
  onReject: () => void
}) {
  const src      = sourceLabel(order)
  const typeIcon = order.type === 'delivery' ? <Truck className="size-3.5" /> : <ShoppingBag className="size-3.5" />

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Reference + type */}
          <div className="shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{src.icon}</span>
              <p className="text-sm font-semibold tabular-nums font-mono">
                {order.reference ?? `#${order.id.slice(-6).toUpperCase()}`}
              </p>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              {typeIcon}
              <span>{order.type === 'delivery' ? 'Delivery' : 'Takeaway'}</span>
              {Number(order.tip_amount) > 0 && (
                <span className="text-emerald-600 font-medium">
                  +{formatCurrency(Number(order.tip_amount))} tip
                </span>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{order.customer_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(order.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
              {order.payment_method && order.payment_method !== 'cash' && (
                <span className="ml-1 text-blue-600">
                  · {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                </span>
              )}
            </p>
          </div>

          {/* Total */}
          {Number(order.total) > 0 && (
            <span className="text-sm font-semibold tabular-nums shrink-0">
              {formatCurrency(Number(order.total))}
            </span>
          )}

          {/* Status */}
          <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'} className="shrink-0">
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>

          {/* Quick actions */}
          <div className="flex gap-1 shrink-0">
            {order.status === 'awaiting_approval' && (
              <>
                <Button size="icon" variant="ghost"
                  className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onReject} disabled={loading}>
                  <X className="size-4" />
                </Button>
                <Button size="icon" variant="ghost"
                  className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={onAccept} disabled={loading}>
                  <Check className="size-4" />
                </Button>
              </>
            )}
            {order.status === 'pending' && (
              <Button size="icon" variant="ghost" className="size-7 text-emerald-600" onClick={onAccept} disabled={loading}>
                <Check className="size-4" />
              </Button>
            )}
            {order.status === 'accepted' && (
              <Button size="icon" variant="ghost" className="size-7" onClick={onPrepare} disabled={loading}>
                <ChevronRight className="size-4" />
              </Button>
            )}
            {order.status === 'preparing' && (
              <Button size="icon" variant="ghost" className="size-7" disabled={loading}
                onClick={order.type === 'delivery' ? onDispatch : onReady}>
                <ChevronRight className="size-4" />
              </Button>
            )}
            {(order.status === 'ready' || order.status === 'dispatched') && (
              <Button size="icon" variant="ghost" className="size-7 text-emerald-600" onClick={onComplete} disabled={loading}>
                <Check className="size-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="size-7" onClick={onSelect}>
              <FileText className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
