import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { ItemDetailClient } from './ItemDetailClient'

export default async function ItemDetailPage({
  params,
}: {
  params: { businessId: string; itemId: string }
}) {
  const { businessId, itemId } = params
  const admin = createAdminClient()

  const [bizRes, cfgRes, itemRes] = await Promise.all([
    admin.from('businesses')
      .select('id, name, primary_color, logo_url')
      .eq('id', businessId).eq('is_active', true).single(),
    admin.from('shop_configs')
      .select('is_published, logo_url')
      .eq('business_id', businessId).maybeSingle(),
    admin.from('menu_items')
      .select('id, category_id, name_el, name_en, description_el, description_en, price, image_url, is_available')
      .eq('id', itemId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single(),
  ])

  if (!bizRes.data || !itemRes.data) notFound()
  if (cfgRes.data?.is_published === false) notFound()

  const biz  = bizRes.data
  const item = itemRes.data

  return (
    <ItemDetailClient
      businessId={businessId}
      businessName={biz.name}
      primaryColor={biz.primary_color ?? '#2563eb'}
      logoUrl={cfgRes.data?.logo_url ?? biz.logo_url ?? null}
      item={item as any}
    />
  )
}
