import { createAdminClient } from '@/lib/db/supabase-server'
import { getShopCustomer } from '@/lib/shop/auth'
import { notFound } from 'next/navigation'
import { MenuPageClient } from './MenuPageClient'

export default async function MenuPage({
  params,
  searchParams,
}: {
  params:       { businessId: string }
  searchParams: { cat?: string; q?: string }
}) {
  const admin = createAdminClient()

  const [bizRes, cfgRes, catsRes, itemsRes, deliveryRes, customer] = await Promise.all([
    admin.from('businesses')
      .select('id, name, primary_color, logo_url, timezone')
      .eq('id', businessId).eq('is_active', true).single(),
    admin.from('shop_configs')
      .select('is_published, logo_url, announcement')
      .eq('business_id', businessId).maybeSingle(),
    admin.from('menu_categories')
      .select('id, name_el, name_en')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order'),
    admin.from('menu_items')
      .select('id, category_id, name_el, name_en, description_el, description_en, price, image_url, is_available, sort_order')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order'),
    admin.from('delivery_configs')
      .select('delivery_fee, free_delivery_above, min_order_amount, estimated_minutes')
      .eq('business_id', businessId).maybeSingle(),
    getShopCustomer(),
  ])

  if (!bizRes.data) notFound()
  if (cfgRes.data?.is_published === false) notFound()

  const biz = bizRes.data

  return (
    <MenuPageClient
      businessId={businessId}
      businessName={biz.name}
      primaryColor={biz.primary_color ?? '#2563eb'}
      logoUrl={cfgRes.data?.logo_url ?? biz.logo_url ?? null}
      categories={catsRes.data ?? []}
      items={(itemsRes.data ?? []) as any[]}
      deliveryFee={deliveryRes.data?.delivery_fee != null ? Number(deliveryRes.data.delivery_fee) : 0}
      customer={customer ? { first_name: customer.first_name, email: customer.email } : null}
      initialCategory={searchParams.cat ?? null}
      initialSearch={searchParams.q ?? ''}
    />
  )
}
