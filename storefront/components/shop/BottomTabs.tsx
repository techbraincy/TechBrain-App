'use client'

import Link        from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'

interface Props {
  businessId:   string
  primaryColor: string
}

interface Tab {
  label:  string
  icon:   typeof Home
  href:   (id: string) => string
  active: (path: string, id: string) => boolean
}

const TABS: Tab[] = [
  {
    label:  'Home',
    icon:   Home,
    href:   (id) => `/shop/${id}`,
    active: (p, id) => p === `/shop/${id}`,
  },
  {
    label:  'Search',
    icon:   Search,
    href:   (id) => `/shop/${id}/menu`,
    active: (p, id) => p === `/shop/${id}/menu`,
  },
  {
    label:  'Cart',
    icon:   ShoppingBag,
    href:   (id) => `/shop/${id}/cart`,
    active: (p, id) => p === `/shop/${id}/cart`,
  },
  {
    label:  'Profile',
    icon:   User,
    href:   (id) => `/shop/${id}/profile`,
    active: (p, id) => p.startsWith(`/shop/${id}/profile`),
  },
]

export function BottomTabs({ businessId, primaryColor }: Props) {
  const pathname = usePathname()
  const { itemCount } = useCart()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white"
      style={{
        borderTopLeftRadius:  50,
        borderTopRightRadius: 50,
        height:               80,
        boxShadow:            '0 -4px 24px rgba(0,0,0,0.10)',
      }}
    >
      <div className="max-w-md mx-auto h-full flex items-center px-6">
        {TABS.map(({ label, icon: Icon, href, active }) => {
          const isActive = active(pathname, businessId)
          const isCart   = label === 'Cart'
          return (
            <Link
              key={label}
              href={href(businessId)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
            >
              <div className="relative">
                <Icon
                  className="size-6 transition-colors"
                  style={{ color: isActive ? primaryColor : '#5D5F6D' }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isCart && itemCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? primaryColor : '#5D5F6D' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
