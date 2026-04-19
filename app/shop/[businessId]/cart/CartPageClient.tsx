'use client'

import Link           from 'next/link'
import { useRouter }  from 'next/navigation'
import { ChevronLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart }    from '@/components/shop/CartContext'
import { formatCurrency } from '@/lib/utils'

interface Props {
  businessId:       string
  primaryColor:     string
  deliveryFee:      number
  freeDeliveryAbove: number | null
}

const DISCOUNT = 0.50  // Fixed $0.50 discount — matches reference app

export function CartPageClient({ businessId, primaryColor, deliveryFee, freeDeliveryAbove }: Props) {
  const router = useRouter()
  const { items, subtotal, itemCount, updateQty, removeItem } = useCart()

  const effectiveDelivery = freeDeliveryAbove && subtotal >= freeDeliveryAbove ? 0 : deliveryFee
  const discount          = items.length > 0 ? DISCOUNT : 0
  const grandTotal        = subtotal + effectiveDelivery - discount

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white px-5 pt-safe pt-5 pb-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="size-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ChevronLeft className="size-5 text-brand-dark" />
            </button>
            <h1 className="text-xl font-bold text-brand-dark">Your Cart</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-24">
          <div className="size-24 rounded-full bg-gray-100 flex items-center justify-center">
            <ShoppingBag className="size-10 text-brand-gray" />
          </div>
          <p className="text-lg font-bold text-brand-dark">Cart Empty</p>
          <p className="text-sm text-brand-gray">Add items to get started</p>
          <Link
            href={`/shop/${businessId}/menu`}
            className="mt-2 px-6 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            Browse menu
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white px-5 pt-safe pt-5 pb-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft className="size-5 text-brand-dark" />
          </button>
          <h1 className="text-xl font-bold text-brand-dark">Your Cart</h1>
        </div>
      </header>

      {/* ── Items list ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.menu_item_id}
            className="bg-white rounded-3xl p-4 flex items-center gap-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            {/* Image */}
            <div className="size-16 rounded-2xl bg-gray-100 shrink-0 overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name_el} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
              )}
            </div>

            {/* Name + price */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brand-dark line-clamp-1">{item.name_el}</p>
              <p className="text-sm font-bold mt-1" style={{ color: primaryColor }}>
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>

            {/* Qty stepper */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateQty(item.menu_item_id, item.quantity - 1)}
                className="size-8 rounded-full border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="size-3.5 text-red-400" />
                ) : (
                  <Minus className="size-3.5 text-brand-gray" />
                )}
              </button>
              <span className="text-sm font-bold w-5 text-center text-brand-dark tabular-nums">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.menu_item_id, item.quantity + 1)}
                className="size-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* ── Summary + CTA ──────────────────────────────────────────── */}
      <div className="bg-white max-w-md w-full mx-auto rounded-t-3xl px-5 pt-5 pb-8"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>

        <div className="space-y-3">
          {/* Total items */}
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray font-medium">Total Items</span>
            <span className="font-bold text-brand-dark">{formatCurrency(subtotal)}</span>
          </div>

          {/* Delivery fee */}
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray font-medium">Delivery Fee</span>
            <span className="font-bold text-brand-dark">
              {effectiveDelivery === 0 ? (
                <span className="text-brand-success">Free</span>
              ) : (
                formatCurrency(effectiveDelivery)
              )}
            </span>
          </div>

          {/* Discount */}
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray font-medium">Discount</span>
            <span className="font-bold text-brand-success">-{formatCurrency(discount)}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between">
              <span className="text-base font-bold text-brand-dark">Grand Total</span>
              <span className="text-base font-bold" style={{ color: primaryColor }}>
                {formatCurrency(Math.max(0, grandTotal))}
              </span>
            </div>
          </div>
        </div>

        {/* Order Now button */}
        <Link
          href={`/shop/${businessId}/checkout`}
          className="mt-5 flex items-center justify-center w-full py-4 rounded-2xl text-white font-bold text-base shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: primaryColor }}
        >
          Order Now
        </Link>
      </div>
    </div>
  )
}
