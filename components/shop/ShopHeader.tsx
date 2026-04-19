'use client'

import Link from 'next/link'
import { ShoppingCart, User, ChevronLeft } from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  businessId:   string
  businessName: string
  primaryColor: string
  customer:     { first_name: string; email: string } | null
  showBack?:    boolean
  backHref?:    string
  onCartOpen?:  () => void
}

export function ShopHeader({ businessId, businessName, primaryColor, customer, showBack, backHref, onCartOpen }: Props) {
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        {showBack && (
          <Link href={backHref ?? `/shop/${businessId}`} className="text-muted-foreground hover:text-foreground -ml-1">
            <ChevronLeft className="size-5" />
          </Link>
        )}

        <Link href={`/shop/${businessId}`} className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="size-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {businessName[0]?.toUpperCase()}
          </div>
          <span className="font-semibold text-sm truncate">{businessName}</span>
        </Link>

        <div className="flex items-center gap-1">
          {customer ? (
            <Link href={`/shop/${businessId}/profile`}>
              <Button variant="ghost" size="icon" className="size-9">
                <User className="size-4" />
              </Button>
            </Link>
          ) : (
            <Link href={`/shop/${businessId}/auth`}>
              <Button variant="ghost" size="sm" className="text-xs">Σύνδεση</Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-9 relative"
            onClick={onCartOpen}
          >
            <ShoppingCart className="size-4" />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 size-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
