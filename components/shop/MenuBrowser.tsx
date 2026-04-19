'use client'

import { useState } from 'react'
import { useCart } from '@/components/shop/CartContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import { Plus, Minus, ShoppingCart } from 'lucide-react'
import type { MenuItem, MenuCategory } from '@/types/db'

interface Props {
  categories:   MenuCategory[]
  items:        MenuItem[]
  primaryColor: string
  lang:         'el' | 'en'
  onCartOpen:   () => void
}

export function MenuBrowser({ categories, items, primaryColor, lang, onCartOpen }: Props) {
  const { addItem, removeItem, updateQty, items: cartItems, itemCount } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0]?.id ?? null
  )

  const cartMap = Object.fromEntries(cartItems.map((i) => [i.menu_item_id, i.quantity]))

  function getQty(itemId: string) { return cartMap[itemId] ?? 0 }

  const visibleItems = activeCategory
    ? items.filter((i) => i.category_id === activeCategory)
    : items

  // Uncategorised items
  const uncategorised = items.filter((i) => !i.category_id)
  const showAll = !activeCategory || activeCategory === '__all__'

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border',
                activeCategory === cat.id
                  ? 'text-white border-transparent'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              )}
              style={activeCategory === cat.id ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
            >
              {lang === 'en' && cat.name_en ? cat.name_en : cat.name_el}
            </button>
          ))}
        </div>
      )}

      {/* Items grid */}
      <div className="space-y-2">
        {visibleItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Δεν υπάρχουν διαθέσιμα προϊόντα
          </div>
        )}
        {visibleItems.map((item) => {
          const qty  = getQty(item.id)
          const name = lang === 'en' && item.name_en ? item.name_en : item.name_el
          const desc = lang === 'en' && item.description_en ? item.description_en : item.description_el
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              {/* Image */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={name}
                  className="size-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="size-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-2xl">
                  🍽️
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{name}</p>
                {desc && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>}
                <p className="text-sm font-semibold mt-1" style={{ color: primaryColor }}>
                  {formatCurrency(item.price)}
                </p>
              </div>

              {/* Qty controls */}
              <div className="shrink-0">
                {qty === 0 ? (
                  <Button
                    size="icon"
                    className="size-8 rounded-full"
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                    onClick={() => addItem({
                      menu_item_id: item.id,
                      name_el:      item.name_el,
                      name_en:      item.name_en,
                      price:        item.price,
                      image_url:    item.image_url,
                      notes:        null,
                    })}
                  >
                    <Plus className="size-4" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7 rounded-full"
                      onClick={() => updateQty(item.id, qty - 1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="text-sm font-semibold w-4 text-center tabular-nums">{qty}</span>
                    <Button
                      size="icon"
                      className="size-7 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => updateQty(item.id, qty + 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky cart button */}
      {itemCount > 0 && (
        <div className="sticky bottom-4 left-0 right-0 px-0">
          <Button
            className="w-full h-12 rounded-xl shadow-lg gap-2 text-base font-semibold"
            style={{ backgroundColor: primaryColor }}
            onClick={onCartOpen}
          >
            <ShoppingCart className="size-5" />
            Προβολή καλαθιού · {itemCount} {itemCount === 1 ? 'προϊόν' : 'προϊόντα'}
          </Button>
        </div>
      )}
    </div>
  )
}
