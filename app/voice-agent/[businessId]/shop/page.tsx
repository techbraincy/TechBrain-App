import { requireBusinessAccess } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/db/supabase-server'
import { ShopAdminClient } from '@/components/voice-agent/ShopAdminClient'

interface Props { params: { businessId: string } }

export default async function ShopPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId, 'manager')
  const admin = createAdminClient()

  const [shopRes, categoriesRes, itemsRes] = await Promise.all([
    admin
      .from('shop_configs')
      .select('*')
      .eq('business_id', params.businessId)
      .maybeSingle(),
    admin
      .from('menu_categories')
      .select('*')
      .eq('business_id', params.businessId)
      .order('sort_order'),
    admin
      .from('menu_items')
      .select('*')
      .eq('business_id', params.businessId)
      .order('sort_order'),
  ])

  // Auto-provision shop config if missing
  let shopConfig = shopRes.data
  if (!shopConfig) {
    const { data } = await admin
      .from('shop_configs')
      .insert({ business_id: params.businessId, is_published: true })
      .select()
      .single()
    shopConfig = data
  }

  const shopUrl = `/shop/${params.businessId}`
  const slugUrl = business.slug ? `/s/${business.slug}` : null

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Online Shop</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Διαχείριση storefront, κατηγοριών και προϊόντων
          </p>
        </div>
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Προβολή shop ↗
        </a>
      </div>

      <ShopAdminClient
        businessId={params.businessId}
        shopConfig={shopConfig}
        initialCategories={categoriesRes.data ?? []}
        initialItems={itemsRes.data ?? []}
        shopUrl={shopUrl}
        slugUrl={slugUrl}
      />
    </div>
  )
}
