'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, User, X, ShoppingCart } from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'
import { getInitials, cn } from '@/lib/utils'

interface Props {
  businessId:   string
  businessName: string
  logoUrl:      string | null
  primaryColor: string
  customer:     { first_name: string; email: string } | null
  onSearch:     (q: string) => void
  onCartOpen:   () => void
}

export function ShopNavbar({
  businessId, businessName, logoUrl, primaryColor, customer, onSearch, onCartOpen,
}: Props) {
  const [searching, setSearching] = useState(false)
  const [query,     setQuery]     = useState('')
  const { itemCount } = useCart()

  function handleQuery(v: string) {
    setQuery(v)
    onSearch(v)
  }

  function clearSearch() {
    setQuery('')
    onSearch('')
    setSearching(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      {/* Main row */}
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Back button */}
        <Link
          href={`/shop/${businessId}`}
          className="size-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors"
          aria-label="Πίσω"
        >
          <ChevronLeft className="size-5 text-gray-700" />
        </Link>

        {/* Logo + name */}
        <Link href={`/shop/${businessId}`} className="flex items-center gap-2 flex-1 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="size-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="size-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {getInitials(businessName)}
            </div>
          )}
          <span className="font-bold text-sm text-gray-900 truncate">{businessName}</span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setSearching(!searching); if (searching) clearSearch() }}
            className="size-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Αναζήτηση"
          >
            {searching ? <X className="size-4 text-gray-700" /> : <Search className="size-4 text-gray-700" />}
          </button>

          {customer ? (
            <Link
              href={`/shop/${businessId}/profile`}
              className="size-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Προφίλ"
            >
              <User className="size-4 text-gray-700" />
            </Link>
          ) : (
            <Link
              href={`/shop/${businessId}/auth`}
              className="h-9 px-3 rounded-xl text-white text-xs font-bold flex items-center"
              style={{ backgroundColor: primaryColor }}
            >
              Σύνδεση
            </Link>
          )}

          <button
            onClick={onCartOpen}
            className="relative size-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Καλάθι"
          >
            <ShoppingCart className="size-4 text-gray-700" />
            {itemCount > 0 && (
              <span
                className="absolute -top-1 -right-1 size-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search input row — revealed when searching */}
      {searching && (
        <div className="max-w-2xl mx-auto px-4 pb-3 animate-fade-in">
          <div className="flex items-center gap-2.5 bg-gray-100 rounded-xl px-3.5 py-2.5">
            <Search className="size-4 text-gray-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
              placeholder="Αναζήτηση προϊόντων…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {query && (
              <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
