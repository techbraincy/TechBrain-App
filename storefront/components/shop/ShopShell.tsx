'use client'

import { usePathname } from 'next/navigation'
import { BottomTabs }  from '@/components/shop/BottomTabs'

interface Props {
  businessId:   string
  primaryColor: string
  children:     React.ReactNode
}

const TAB_PATHS = (id: string) => [
  `/shop/${id}`,
  `/shop/${id}/menu`,
  `/shop/${id}/cart`,
  `/shop/${id}/profile`,
]

export function ShopShell({ businessId, primaryColor, children }: Props) {
  const pathname  = usePathname()
  const showTabs  = TAB_PATHS(businessId).includes(pathname)

  return (
    <>
      <div className={showTabs ? 'pb-24' : ''}>
        {children}
      </div>
      {showTabs && (
        <BottomTabs businessId={businessId} primaryColor={primaryColor} />
      )}
    </>
  )
}
