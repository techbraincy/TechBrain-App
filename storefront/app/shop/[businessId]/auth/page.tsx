import { createAdminClient } from '@/lib/db/supabase-server'
import { getShopCustomer } from '@/lib/shop/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ShopAuthClient } from './ShopAuthClient'

export default async function ShopAuthPage({ params }: { params: { businessId: string } }) {
  const customer = await getShopCustomer()
  if (customer) redirect(`/shop/${params.businessId}`)

  const admin = createAdminClient()
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, primary_color')
    .eq('id', params.businessId)
    .eq('is_active', true)
    .single()

  if (!business) notFound()

  return (
    <ShopAuthClient
      businessId={params.businessId}
      businessName={business.name}
      primaryColor={business.primary_color ?? '#2563eb'}
    />
  )
}
