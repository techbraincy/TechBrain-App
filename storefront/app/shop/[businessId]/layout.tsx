import { Quicksand } from 'next/font/google'
import { CartProvider } from '@/components/shop/CartContext'
import { ShopShell }   from '@/components/shop/ShopShell'
import { Toaster }     from 'sonner'
import { createAdminClient } from '@/lib/db/supabase-server'

const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand', display: 'swap', weight: ['400','500','600','700'] })

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const admin = createAdminClient()
  const { data: biz } = await admin.from('businesses').select('primary_color').eq('id', businessId).single()
  const primaryColor = biz?.primary_color ?? '#FE8C00'
  return (
    <CartProvider businessId={businessId}>
      <div className={`${quicksand.variable} font-quicksand`}>
        <ShopShell businessId={businessId} primaryColor={primaryColor}>{children}</ShopShell>
        <Toaster position="top-center" richColors />
      </div>
    </CartProvider>
  )
}
