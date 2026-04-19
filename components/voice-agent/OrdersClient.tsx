'use client'

import { useState, useCallback } from 'react'
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
  Phone, User, MapPin, FileText,
} from 'lucide-react'
import type { Order, OrderItem, OrderStatus, BusinessFeatures } from '@/types/db'

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
  dispatched:        'Αποστολή',
  completed:         'Ολοκληρώθηκε',
  cancelled:         'Ακυρώθηκε',
}

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'warning' | 'success' | 'destructive' | 'secondary' | 'info'> = {
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

const TAB_STATUSES: Record<string, OrderStatus[] | undefined> = {
  active:    ['pending', 'awaiting_approval', 'accepted', 'preparing', 'ready', 'dispatched'],
  completed: ['completed'],
  cancelled: ['cancelled', 'rejected'],
}

interface Props {
  businessId:    string
  initialOrders: OrderWithItems[]
  features:      BusinessFeatures | null
}

export function OrdersClient({ businessId, initialOrders, features }: Props) {
  const [orders, setOrders]     = useState(initialOrders)
  const [selected, setSelected] = useState<OrderWithItems | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading]   = useState<string | null>(null) // orderId being acted on

  const updateOrder = useCallback(async (orderId: string, status: OrderStatus, extra?: Record<string, unknown>) => {
    setLoading(orderId)
    try {
      const res = await fetch(`/api/businesses/${businessId}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...json.order } : o))
      if (selected?.id === orderId) setSelected((s) => s ? { ...s, ...json.order } : s)
      toast.success(`Παραγγελία ${STATUS_LABELS[status].toLowerCase()}`)
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

  return (
    <>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Ενεργές ({orders.filter((o) => TAB_STATUSES.active?.includes(o.status)).length})
          </TabsTrigger>
          <TabsTrigger value="completed">Ολοκληρωμένες</TabsTrigger>
          <TabsTrigger value="cancelled">Ακυρωμένες</TabsTrigger>
        </TabsList>

        {(['active', 'completed', 'cancelled'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {(() => {
              const filtered = orders.filter((o) => TAB_STATUSES[tab]?.includes(o.status))
              if (!filtered.length) {
                return (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                    <ShoppingBag className="size-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Καμία παραγγελία</p>
                  </div>
                )
              }
              return (
                <div className="space-y-2">
                  {filtered.map((order) => (
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
                      features={features}
                    />
                  ))}
                </div>
              )
            })()}
          </TabsContent>
        ))}
      </Tabs>

      {/* Order detail dialog */}
      <Dialog open={!!selected && !rejecting} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selected.reference}</span>
                <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-1.5 text-sm">
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
                    <span>{selected.delivery_address}</span>
                  </div>
                )}
                {selected.delivery_notes && (
                  <div className="flex items-start gap-2">
                    <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{selected.delivery_notes}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              {selected.order_items?.length > 0 && (
                <div className="rounded-xl border border-border divide-y divide-border">
                  {selected.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{item.quantity}× {item.name_el}</span>
                      {item.unit_price > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                  {selected.total > 0 && (
                    <div className="flex justify-between px-3 py-2 text-sm font-semibold">
                      <span>Σύνολο</span>
                      <span>{formatCurrency(selected.total)}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">{formatDateTime(selected.created_at)}</p>
            </div>

            <DialogFooter className="flex-row gap-2">
              {selected.status === 'awaiting_approval' && (
                <>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => setRejecting(true)}>
                    <X className="size-4" /> Απόρριψη
                  </Button>
                  <Button size="sm" className="flex-1" loading={loading === selected.id}
                    onClick={() => updateOrder(selected.id, 'accepted')}>
                    <Check className="size-4" /> Αποδοχή
                  </Button>
                </>
              )}
              {selected.status === 'accepted' && (
                <Button size="sm" className="flex-1" loading={loading === selected.id}
                  onClick={() => updateOrder(selected.id, 'preparing')}>
                  Έναρξη προετοιμασίας
                </Button>
              )}
              {selected.status === 'preparing' && (
                <Button size="sm" className="flex-1" loading={loading === selected.id}
                  onClick={() => updateOrder(selected.id, selected.type === 'delivery' ? 'dispatched' : 'ready')}>
                  {selected.type === 'delivery' ? 'Αποστολή' : 'Έτοιμο'}
                </Button>
              )}
              {(selected.status === 'ready' || selected.status === 'dispatched') && (
                <Button size="sm" className="flex-1" loading={loading === selected.id}
                  onClick={() => updateOrder(selected.id, 'completed')}>
                  <Check className="size-4" /> Ολοκλήρωση
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejecting} onOpenChange={(o) => { if (!o) { setRejecting(false); setRejectReason('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Απόρριψη παραγγελίας</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selected?.reference}</p>
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Αιτία (προαιρετικό)</Label>
              <Input
                id="reject-reason"
                placeholder="π.χ. Δεν υπάρχει διαθεσιμότητα"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setRejecting(false); setRejectReason('') }}>Ακύρωση</Button>
            <Button variant="destructive" size="sm" loading={!!loading}
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
  order, loading, onSelect, onAccept, onPrepare, onReady, onDispatch, onComplete, onReject, features,
}: {
  order: OrderWithItems
  loading: boolean
  onSelect: () => void
  onAccept: () => void
  onPrepare: () => void
  onReady: () => void
  onDispatch: () => void
  onComplete: () => void
  onReject: () => void
  features: BusinessFeatures | null
}) {
  const typeIcon = order.type === 'delivery' ? <Truck className="size-3.5" /> : <ShoppingBag className="size-3.5" />

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Reference + type */}
          <div className="shrink-0">
            <p className="text-sm font-semibold tabular-nums">{order.reference}</p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              {typeIcon}
              <span className="capitalize">{order.type === 'delivery' ? 'Delivery' : 'Takeaway'}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{order.customer_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(order.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Items count */}
          {order.order_items?.length > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">{order.order_items.length} είδη</span>
          )}

          {/* Status */}
          <Badge variant={STATUS_VARIANT[order.status]} className="shrink-0">
            {STATUS_LABELS[order.status]}
          </Badge>

          {/* Quick actions */}
          <div className="flex gap-1 shrink-0">
            {order.status === 'awaiting_approval' && (
              <>
                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onReject} disabled={loading}>
                  <X className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={onAccept} disabled={loading}>
                  <Check className="size-4" />
                </Button>
              </>
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
              <Button size="icon" variant="ghost" className="size-7 text-emerald-600"
                onClick={onComplete} disabled={loading}>
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
