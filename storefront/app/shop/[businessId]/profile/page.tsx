import { requireShopCustomer } from '@/lib/shop/auth'
import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage({ params }: { params: { businessId: string } }) {
  const customer = await requireShopCustomer(params.businessId)

  const admin = createAdminClient()
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, primary_color')
    .eq('id', params.businessId)
    .eq('is_active', true)
    .single()

  if (!business) notFound()

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader
        businessId={params.businessId}
        businessName={business.name}
        primaryColor={business.primary_color ?? '#2563eb'}
        customer={{ first_name: customer.first_name, email: customer.email }}
        showBack
      />

      <main className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-lg font-bold mb-4">Το προφίλ μου</h1>
        <ProfileClient
          businessId={params.businessId}
          primaryColor={business.primary_color ?? '#2563eb'}
          customer={customer}
        />
      </main>
    </div>
  )
}
