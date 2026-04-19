import { requireShopCustomer } from '@/lib/shop/auth'
import { createClient } from '@/lib/db/supabase-server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { AddressesClient } from './AddressesClient'

export default async function AddressesPage({ params }: { params: { businessId: string } }) {
  const customer = await requireShopCustomer(params.businessId)

  const admin    = createAdminClient()
  const supabase = createClient()

  const [businessRes, addressesRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, primary_color')
      .eq('id', params.businessId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (!businessRes.data) notFound()

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader
        businessId={params.businessId}
        businessName={businessRes.data.name}
        primaryColor={businessRes.data.primary_color ?? '#2563eb'}
        customer={{ first_name: customer.first_name, email: customer.email }}
        showBack
        backHref={`/shop/${params.businessId}/profile`}
      />

      <main className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-lg font-bold mb-4">Διευθύνσεις delivery</h1>
        <AddressesClient
          businessId={params.businessId}
          primaryColor={businessRes.data.primary_color ?? '#2563eb'}
          initialAddresses={addressesRes.data ?? []}
        />
      </main>
    </div>
  )
}
