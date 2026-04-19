import { createAdminClient } from '@/lib/db/supabase-server'
import { getShopCustomer } from '@/lib/shop/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ShopAuthClient } from './ShopAuthClient'

export default async function ShopAuthPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const customer = await getShopCustomer()
  if (customer) redirect(`/shop/${businessId}`)

  const admin = createAdminClient()
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, primary_color')
    .eq('id', businessId)
    .eq('is_active', true)
    .single()

  if (!business) notFound()

  return (
    <ShopAuthClient
      businessId={businessId}
      businessName={business.name}
      primaryColor={business.primary_color ?? '#2563eb'}
    />
  )
}
