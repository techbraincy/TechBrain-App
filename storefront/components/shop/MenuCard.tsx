'use client'

import Link        from 'next/link'
import { Plus }    from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'
import { formatCurrency } from '@/lib/utils'
import type { MenuItem } from '@/types/db'

interface Props {
  item:         MenuItem
  businessId:   string
  primaryColor: string
  lang:         'el' | 'en'
}

export function MenuCard({ item, businessId, primaryColor, lang }: Props) {
  const { items: cartItems, addItem, updateQty } = useCart()
  const cartItem = cartItems.find((i) => i.menu_item_id === item.id)
  const qty      = cartItem?.quantity ?? 0

  const name = lang === 'en' && item.name_en ? item.name_en : item.name_el

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    addItem({
      menu_item_id: item.id,
      name_el:      item.name_el,
      name_en:      item.name_en,
      price:        item.price,
      image_url:    item.image_url,
      notes:        null,
    })
  }

  return (
    <Link href={`/shop/${businessId}/menu/${item.id}`} className="block">
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-sm active:scale-95 transition-transform"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
      >
        {/* Square image */}
        <div className="relative aspect-square bg-gray-100">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
          )}

          {/* Cart qty badge */}
          {qty > 0 && (
            <div
              className="absolute top-2 left-2 size-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {qty}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 py-3">
          <p className="text-sm font-bold text-brand-dark leading-tight line-clamp-1">{name}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold" style={{ color: primaryColor }}>
              {formatCurrency(item.price)}
            </span>
            <button
              onClick={handleAdd}
              className="size-8 rounded-full flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
              style={{ backgroundColor: primaryColor }}
              aria-label={`Add ${name}`}
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
