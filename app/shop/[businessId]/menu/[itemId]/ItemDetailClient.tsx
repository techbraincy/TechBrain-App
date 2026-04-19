'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { ChevronLeft, Plus, Minus, ShoppingCart } from 'lucide-react'
import { useCart }     from '@/components/shop/CartContext'
import { formatCurrency } from '@/lib/utils'
import type { MenuItem } from '@/types/db'

interface Props {
  businessId:   string
  businessName: string
  primaryColor: string
  logoUrl:      string | null
  item:         MenuItem
}

export function ItemDetailClient({ businessId, primaryColor, item }: Props) {
  const router       = useRouter()
  const { items: cartItems, addItem, updateQty } = useCart()
  const cartItem     = cartItems.find((i) => i.menu_item_id === item.id)
  const qty          = cartItem?.quantity ?? 0
  const [notes, setNotes] = useState(cartItem?.notes ?? '')

  const name = item.name_en ? item.name_en : item.name_el
  const desc = item.description_en ?? item.description_el

  function handleAdd() {
    addItem({
      menu_item_id: item.id,
      name_el:      item.name_el,
      name_en:      item.name_en,
      price:        item.price,
      image_url:    item.image_url,
      notes:        notes || null,
    })
  }

  function handleBack() {
    router.back()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Image hero */}
      <div className="relative w-full aspect-square bg-gray-100 max-h-80 shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
        {/* Back button overlay */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 size-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          aria-label="Πίσω"
        >
          <ChevronLeft className="size-5 text-gray-800" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-32 max-w-2xl w-full mx-auto space-y-4">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 leading-tight flex-1">{name}</h1>
          <span className="text-xl font-bold shrink-0" style={{ color: primaryColor }}>
            {formatCurrency(item.price)}
          </span>
        </div>

        {/* Description */}
        {desc && (
          <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
        )}

        {/* Unavailable notice */}
        {!item.is_available && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
            Μη διαθέσιμο αυτή τη στιγμή.
          </div>
        )}

        {/* Notes */}
        {item.is_available && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Σημειώσεις
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="π.χ. χωρίς κρεμμύδι, extra sauce…"
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 resize-none"
            />
          </div>
        )}
      </div>

      {/* Sticky bottom action */}
      {item.is_available && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-pb">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {qty > 0 ? (
              <>
                {/* Qty stepper */}
                <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
                  <button
                    onClick={() => updateQty(item.id, qty - 1)}
                    className="size-7 rounded-full border border-gray-300 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus className="size-3.5 text-gray-700" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center tabular-nums">{qty}</span>
                  <button
                    onClick={handleAdd}
                    className="size-7 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Go to cart */}
                <button
                  onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShoppingCart className="size-4" />
                  Προβολή καλαθιού · {formatCurrency(item.price * qty)}
                </button>
              </>
            ) : (
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="size-4" />
                Προσθήκη στο καλάθι · {formatCurrency(item.price)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
