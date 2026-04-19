'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'
import { formatCurrency } from '@/lib/utils'

interface Props {
  primaryColor: string
  onOpen:       () => void
}

export function CartBar({ primaryColor, onOpen }: Props) {
  const { itemCount, subtotal } = useCart()

  if (itemCount === 0) return null

  return (
    // Outer gradient fade prevents content being hidden under the bar
    <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-5 pt-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
      <button
        onClick={onOpen}
        className="pointer-events-auto w-full max-w-2xl mx-auto flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl active:scale-95 transition-transform"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Item count badge */}
        <span className="size-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
          {itemCount}
        </span>

        {/* Label */}
        <span className="flex-1 text-left text-sm font-bold">Προβολή καλαθιού</span>

        {/* Total */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-bold">{formatCurrency(subtotal)}</span>
          <ShoppingCart className="size-4 opacity-80" />
        </div>
      </button>
    </div>
  )
}
