import { createAdminClient } from '@/lib/db/supabase-server'
import { getShopCustomer } from '@/lib/shop/auth'
import { notFound } from 'next/navigation'
import { StorefrontHome } from '@/components/shop/StorefrontHome'

function isCurrentlyOpen(hours: Array<{ day_of_week: number; is_open: boolean; open_time: string | null; close_time: string | null }>, timezone: string): boolean {
  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: timezone || 'Europe/Athens' }))
    const day = now.getDay()
    const h   = hours.find((r) => r.day_of_week === day)
    if (!h?.is_open || !h.open_time || !h.close_time) return false
    const [oh, om] = h.open_time.split(':').map(Number)
    const [ch, cm] = h.close_time.split(':').map(Number)
    const mins = now.getHours() * 60 + now.getMinutes()
    return mins >= oh * 60 + om && mins < ch * 60 + cm
  } catch {
    return true
  }
}

export default async function ShopHomePage({ params }: { params: { businessId: string } }) {
  const admin = createAdminClient()

  const [bizRes, cfgRes, catsRes, deliveryRes, hoursRes, customer] = await Promise.all([
    admin.from('businesses')
      .select('id, name, type, description, address, city, phone, primary_color, logo_url, timezone, slug')
      .eq('id', params.businessId).eq('is_active', true).single(),
    admin.from('shop_configs')
      .select('is_published, cover_image_url, announcement, subtitle, logo_url, hero_tagline, banners')
      .eq('business_id', params.businessId).maybeSingle(),
    admin.from('menu_categories')
      .select('id, name_el, name_en').eq('business_id', params.businessId)
      .eq('is_active', true).order('sort_order').limit(8),
    admin.from('delivery_configs')
      .select('delivery_fee, free_delivery_above, min_order_amount, estimated_minutes')
      .eq('business_id', params.businessId).maybeSingle(),
    admin.from('operating_hours')
      .select('day_of_week, is_open, open_time, close_time')
      .eq('business_id', params.businessId),
    getShopCustomer(),
  ])

  if (!bizRes.data) notFound()
  if (cfgRes.data?.is_published === false) notFound()

  const biz      = bizRes.data
  const cfg      = cfgRes.data
  const delivery = deliveryRes.data
  const isOpen   = isCurrentlyOpen(hoursRes.data ?? [], biz.timezone)

  return (
    <StorefrontHome
      businessId={params.businessId}
      businessName={biz.name}
      businessAddress={biz.address && biz.city ? `${biz.address}, ${biz.city}` : biz.city ?? biz.address ?? null}
      primaryColor={biz.primary_color ?? '#2563eb'}
      logoUrl={cfg?.logo_url ?? biz.logo_url ?? null}
      coverImageUrl={cfg?.cover_image_url ?? null}
      subtitle={cfg?.subtitle ?? biz.description ?? null}
      heroTagline={cfg?.hero_tagline ?? null}
      announcement={cfg?.announcement ?? null}
      banners={(cfg?.banners as any[]) ?? []}
      isOpen={isOpen}
      categories={catsRes.data ?? []}
      deliveryFee={delivery?.delivery_fee != null ? Number(delivery.delivery_fee) : null}
      freeDeliveryAbove={delivery?.free_delivery_above != null ? Number(delivery.free_delivery_above) : null}
      minOrderAmount={delivery?.min_order_amount != null ? Number(delivery.min_order_amount) : null}
      estimatedMinutes={delivery?.estimated_minutes != null ? Number(delivery.estimated_minutes) : null}
      customer={customer ? { first_name: customer.first_name, email: customer.email } : null}
    />
  )
}
