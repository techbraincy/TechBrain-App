import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound }          from 'next/navigation'
import { CartPageClient }    from './CartPageClient'

export default async function CartPage({ params }: { params: { businessId: string } }) {
  const admin = createAdminClient()

  const [bizRes, deliveryRes] = await Promise.all([
    admin.from('businesses')
      .select('id, name, primary_color')
      .eq('id', params.businessId).eq('is_active', true).single(),
    admin.from('delivery_configs')
      .select('delivery_fee, min_order_amount, free_delivery_above')
      .eq('business_id', params.businessId).maybeSingle(),
  ])

  if (!bizRes.data) notFound()

  return (
    <CartPageClient
      businessId={params.businessId}
      primaryColor={bizRes.data.primary_color ?? '#FE8C00'}
      deliveryFee={deliveryRes.data?.delivery_fee != null ? Number(deliveryRes.data.delivery_fee) : 5}
      freeDeliveryAbove={deliveryRes.data?.free_delivery_above != null ? Number(deliveryRes.data.free_delivery_above) : null}
    />
  )
}
