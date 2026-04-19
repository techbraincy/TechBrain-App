'use client'

import { useCart } from '@/components/shop/CartContext'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import { X, Minus, Plus, ShoppingCart, Truck, Package } from 'lucide-react'
import Link from 'next/link'

interface Props {
  open:         boolean
  onClose:      () => void
  businessId:   string
  primaryColor: string
  deliveryFee:  number
  serviceFee:   number
  minOrder:     number
  lang:         'el' | 'en'
}

const TIP_OPTIONS = [0, 0.5, 1, 2]

export function CartSheet({ open, onClose, businessId, primaryColor, deliveryFee, serviceFee, minOrder, lang }: Props) {
  const {
    items, fulfillment_type, tip_amount, subtotal, itemCount,
    updateQty, removeItem, setFulfillment, setTip,
  } = useCart()

  const effectiveDelivery = (fulfillment_type === 'delivery' && subtotal < minOrder) ? 0 : (fulfillment_type === 'delivery' ? deliveryFee : 0)
  const total = subtotal + serviceFee + effectiveDelivery + tip_amount

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <ShoppingCart className="size-4" /> Καλάθι
            {itemCount > 0 && <span className="text-muted-foreground font-normal text-sm">({itemCount})</span>}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ShoppingCart className="size-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Το καλάθι σας είναι άδειο</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-4">
              {/* Fulfillment toggle */}
              <div className="flex rounded-xl overflow-hidden border border-border">
                <button
                  onClick={() => setFulfillment('takeaway')}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                    fulfillment_type === 'takeaway' ? 'text-white' : 'text-muted-foreground bg-background')}
                  style={fulfillment_type === 'takeaway' ? { backgroundColor: primaryColor } : {}}
                >
                  <Package className="size-4" /> Takeaway
                </button>
                <button
                  onClick={() => setFulfillment('delivery')}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                    fulfillment_type === 'delivery' ? 'text-white' : 'text-muted-foreground bg-background')}
                  style={fulfillment_type === 'delivery' ? { backgroundColor: primaryColor } : {}}
                >
                  <Truck className="size-4" /> Delivery
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {items.map((item) => {
                  const name = lang === 'en' && item.name_en ? item.name_en : item.name_el
                  return (
                    <div key={item.menu_item_id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} / τεμ.</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQty(item.menu_item_id, item.quantity - 1)}
                          className="size-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.menu_item_id, item.quantity + 1)}
                          className="size-7 rounded-full border border-border flex items-center justify-center"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold tabular-nums w-14 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Tip */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Φιλοδώρημα διανομέα</p>
                <div className="flex gap-2">
                  {TIP_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTip(t)}
                      className={cn('flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors',
                        tip_amount === t ? 'text-white border-transparent' : 'border-border text-muted-foreground')}
                      style={tip_amount === t ? { backgroundColor: primaryColor } : {}}
                    >
                      {t === 0 ? 'Χωρίς' : `€${t.toFixed(2)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee summary */}
              <div className="rounded-xl bg-muted/40 divide-y divide-border">
                <div className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Υποσύνολο</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Χρέωση εφαρμογής</span>
                  <span>{formatCurrency(serviceFee)}</span>
                </div>
                {fulfillment_type === 'delivery' && (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{effectiveDelivery === 0 ? 'Δωρεάν' : formatCurrency(effectiveDelivery)}</span>
                  </div>
                )}
                {tip_amount > 0 && (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Φιλοδώρημα</span>
                    <span>{formatCurrency(tip_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2.5 text-sm font-semibold">
                  <span>Σύνολο</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-border">
            {fulfillment_type === 'delivery' && subtotal < minOrder && minOrder > 0 ? (
              <p className="text-xs text-amber-600 text-center mb-3">
                Ελάχιστη παραγγελία delivery: {formatCurrency(minOrder)}
              </p>
            ) : null}
            <Link href={`/shop/${businessId}/checkout`} onClick={onClose}>
              <Button
                className="w-full h-12 rounded-xl text-base font-semibold"
                style={{ backgroundColor: primaryColor }}
                disabled={fulfillment_type === 'delivery' && subtotal < minOrder && minOrder > 0}
              >
                Ολοκλήρωση παραγγελίας · {formatCurrency(total)}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
