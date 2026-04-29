'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, Check, XCircle, ChefHat, Truck, CheckCircle2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { ReferenceTag } from './ReferenceTag'
import { StatusPill } from './StatusPill'
import { SourceIcon } from './SourceIcon'
import {
  formatDateTimeFull,
  formatPhone,
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  orderStatusTone,
  eur,
} from '@/lib/admin/formatters'
import type { Order, OrderStatus } from '@/lib/admin/types'
import { setOrderStatus, setOrderNote } from '@/lib/admin/actions'

interface Props {
  order: Order | null
  onClose: () => void
}

export function OrderDetailDrawer({ order, onClose }: Props) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState('')
  const [noteDirty, setNoteDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (order) {
      setNote(order.notes ?? '')
      setNoteDirty(false)
      setError(null)
    }
  }, [order])

  const tryClose = () => {
    if (noteDirty) {
      const ok = window.confirm('You have unsaved note changes. Discard?')
      if (!ok) return
    }
    onClose()
  }

  const run = (fn: () => Promise<void>, after?: () => void) => {
    setError(null)
    start(async () => {
      try {
        await fn()
        after?.()
        onClose()
      } catch (e: any) {
        setError(e?.message ?? 'Action failed')
      }
    })
  }

  if (!order) return null

  const nextStatuses: OrderStatus[] = (() => {
    switch (order.status) {
      case 'pending':
      case 'awaiting_approval':
        return ['accepted', 'rejected']
      case 'accepted':
        return ['preparing', 'cancelled']
      case 'preparing':
        return ['ready', 'cancelled']
      case 'ready':
        return order.type === 'delivery' ? ['dispatched', 'cancelled'] : ['completed', 'cancelled']
      case 'dispatched':
        return ['completed', 'cancelled']
      default:
        return []
    }
  })()

  const statusButtonProps: Record<
    OrderStatus,
    { label: string; icon: typeof Check; variant: string }
  > = {
    pending: { label: 'Pending', icon: Check, variant: 'outline' },
    awaiting_approval: { label: 'Awaiting', icon: Check, variant: 'outline' },
    accepted: { label: 'Accept', icon: Check, variant: 'primary' },
    preparing: { label: 'Start preparing', icon: ChefHat, variant: 'outline' },
    ready: { label: 'Mark ready', icon: CheckCircle2, variant: 'outline' },
    dispatched: { label: 'Dispatch', icon: Truck, variant: 'outline' },
    completed: { label: 'Mark completed', icon: CheckCircle2, variant: 'outline' },
    rejected: { label: 'Reject', icon: XCircle, variant: 'danger' },
    cancelled: { label: 'Cancel', icon: XCircle, variant: 'danger' },
  }

  return (
    <Dialog.Root open={!!order} onOpenChange={(o) => !o && tryClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content
          className="drawer-content"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (noteDirty) {
              e.preventDefault()
              tryClose()
            }
          }}
          onPointerDownOutside={(e) => {
            if (noteDirty) e.preventDefault()
          }}
        >
          <header
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--mist)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Dialog.Title className="heading-display" style={{ fontSize: 20, margin: 0 }}>
                Order
              </Dialog.Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <ReferenceTag reference={order.reference} />
                <StatusPill label={ORDER_STATUS_LABEL[order.status]} tone={orderStatusTone(order.status)} />
                <SourceIcon source={order.source} />
                <span style={{ fontSize: 12, color: 'var(--charcoal)' }}>
                  {ORDER_TYPE_LABEL[order.type]}
                </span>
              </div>
            </div>
            <button className="btn" data-variant="ghost" onClick={tryClose} aria-label="Close drawer" style={{ padding: 6 }}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <DetailRow label="Placed at" value={formatDateTimeFull(order.created_at)} />
            <DetailRow label="Customer" value={order.customer_name ?? '—'} />
            <DetailRow label="Phone" value={formatPhone(order.customer_phone) || '—'} />
            <DetailRow label="Language" value={(order.customer_language ?? '—').toUpperCase()} />
            {order.delivery_address && (
              <DetailRow label="Delivery address" value={order.delivery_address} />
            )}
            {order.payment_method && (
              <DetailRow label="Payment" value={order.payment_method} />
            )}

            {/* Items */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--ash)',
                  marginBottom: 8,
                }}
              >
                Items
              </div>
              {order.items && order.items.length > 0 ? (
                <table style={{ width: '100%', fontSize: 13 }}>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--mist)' }}>
                        <td style={{ padding: '8px 0', width: 32, color: 'var(--charcoal)' }}>
                          {it.quantity}×
                        </td>
                        <td style={{ padding: '8px 0' }}>{it.item_name}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {eur(Number(it.subtotal ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--ash)', fontSize: 13 }}>No items recorded</div>
              )}
            </div>

            {/* Totals */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--mist)' }}>
              <Money label="Subtotal" value={Number(order.subtotal ?? 0)} />
              {Number(order.delivery_fee ?? 0) > 0 && (
                <Money label="Delivery fee" value={Number(order.delivery_fee)} />
              )}
              {Number(order.service_fee ?? 0) > 0 && (
                <Money label="Service fee" value={Number(order.service_fee)} />
              )}
              {Number(order.tip_amount ?? 0) > 0 && (
                <Money label="Tip" value={Number(order.tip_amount)} />
              )}
              {Number(order.coupon_discount ?? 0) > 0 && (
                <Money label="Discount" value={-Number(order.coupon_discount)} />
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  paddingTop: 8,
                  borderTop: '1px solid var(--mist)',
                  fontWeight: 600,
                }}
              >
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{eur(Number(order.total ?? 0))}</span>
              </div>
            </div>

            {/* Note */}
            <div style={{ marginTop: 20 }}>
              <label
                htmlFor="order-note"
                style={{
                  fontSize: 11,
                  color: 'var(--ash)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Note
              </label>
              <textarea
                id="order-note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  setNoteDirty(e.target.value !== (order.notes ?? ''))
                }}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid var(--mist)',
                  borderRadius: 6,
                  padding: 10,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  resize: 'vertical',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                }}
              />
              {noteDirty && (
                <button
                  className="btn"
                  data-variant="outline"
                  style={{ marginTop: 8 }}
                  disabled={pending}
                  onClick={() => run(() => setOrderNote(order.id, note), () => setNoteDirty(false))}
                >
                  Save note
                </button>
              )}
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 6,
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-ink)',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          <footer
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--mist)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {nextStatuses.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--ash)' }}>No further actions</span>
            ) : (
              nextStatuses.map((next) => {
                const cfg = statusButtonProps[next]
                const Icon = cfg.icon
                return (
                  <button
                    key={next}
                    className="btn"
                    data-variant={cfg.variant}
                    disabled={pending}
                    onClick={() => run(() => setOrderStatus(order.id, next))}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {cfg.label}
                  </button>
                )
              })
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        padding: '8px 0',
        borderBottom: '1px solid var(--mist)',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}

function Money({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--charcoal)', padding: '4px 0' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{eur(value)}</span>
    </div>
  )
}
