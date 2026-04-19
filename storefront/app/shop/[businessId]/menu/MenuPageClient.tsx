'use client'

import { useState, useMemo }  from 'react'
import { ShoppingBag }        from 'lucide-react'
import Link                   from 'next/link'
import { CategoryFilter }     from '@/components/shop/CategoryFilter'
import { MenuCard }           from '@/components/shop/MenuCard'
import { CartBar }            from '@/components/shop/CartBar'
import { CartSheet }          from '@/components/shop/CartSheet'
import { useCart }            from '@/components/shop/CartContext'
import type { MenuItem, MenuCategory } from '@/types/db'

interface Props {
  businessId:      string
  businessName:    string
  primaryColor:    string
  logoUrl:         string | null
  categories:      Pick<MenuCategory, 'id' | 'name_el' | 'name_en'>[]
  items:           Pick<MenuItem, 'id' | 'category_id' | 'name_el' | 'name_en' | 'description_el' | 'description_en' | 'price' | 'image_url' | 'is_available' | 'sort_order'>[]
  deliveryFee:     number
  customer:        { first_name: string; email: string } | null
  initialCategory: string | null
  initialSearch:   string
}

export function MenuPageClient({
  businessId, businessName, primaryColor, logoUrl,
  categories, items, deliveryFee, customer,
  initialCategory, initialSearch,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory)
  const [search,         setSearch]         = useState(initialSearch)
  const [cartOpen,       setCartOpen]       = useState(false)
  const { itemCount }                       = useCart()

  const lang = 'el' as const

  // Filter by search
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.name_el.toLowerCase().includes(q) ||
        (it.name_en ?? '').toLowerCase().includes(q) ||
        (it.description_el ?? '').toLowerCase().includes(q),
    )
  }, [items, search])

  // Filter by category
  const filtered = useMemo(() => {
    if (!activeCategory) return searched
    return searched.filter((it) => it.category_id === activeCategory)
  }, [searched, activeCategory])

  // Split into left (even) and right (odd) columns — staggered layout like reference
  const leftItems  = filtered.filter((_, i) => i % 2 === 0)
  const rightItems = filtered.filter((_, i) => i % 2 === 1)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="bg-white px-5 pt-safe pt-5 pb-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-dark">Search</h1>
            <p className="text-xs text-brand-gray font-medium mt-0.5">Find your favorite food</p>
          </div>
          <Link
            href={`/shop/${businessId}/cart`}
            className="relative size-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingBag className="size-5 text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold"
                style={{ color: primaryColor }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mt-4">
          <div
            className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <svg className="size-4 text-brand-gray shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveCategory(null) }}
              placeholder="Search for food..."
              className="flex-1 bg-transparent text-sm text-brand-dark placeholder:text-brand-gray outline-none font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-brand-gray hover:text-brand-dark text-lg leading-none">×</button>
            )}
          </div>
        </div>
      </header>

      {/* ── Category pills ──────────────────────────────────────────── */}
      <CategoryFilter
        categories={categories}
        activeId={activeCategory}
        primaryColor={primaryColor}
        lang={lang}
        onSelect={setActiveCategory}
      />

      {/* ── Product grid ────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pt-5 pb-32">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-brand-gray py-20 font-medium">
            {search ? `No results for "${search}"` : 'No items found.'}
          </p>
        ) : (
          /* Staggered 2-column layout — right column offset by mt-10 (reference style) */
          <div className="flex gap-3 items-start">
            <div className="flex-1 flex flex-col gap-4">
              {leftItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item as any}
                  businessId={businessId}
                  primaryColor={primaryColor}
                  lang={lang}
                />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-4 mt-10">
              {rightItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item as any}
                  businessId={businessId}
                  primaryColor={primaryColor}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <CartBar primaryColor={primaryColor} onOpen={() => setCartOpen(true)} />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        businessId={businessId}
        primaryColor={primaryColor}
        deliveryFee={deliveryFee}
        serviceFee={0.30}
        minOrder={0}
        lang={lang}
      />
    </div>
  )
}
