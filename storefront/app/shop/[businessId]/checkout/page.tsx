import { createAdminClient } from '@/lib/db/supabase-server'
import { requireShopCustomer } from '@/lib/shop/auth'
import { notFound } from 'next/navigation'
import { CheckoutClient } from '@/components/shop/CheckoutClient'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { createClient } from '@/lib/db/supabase-server'

export default async function CheckoutPage({ params }: { params: { businessId: string } }) {
  const [customer, admin] = await Promise.all([
    requireShopCustomer(params.businessId),
    Promise.resolve(createAdminClient()),
  ])

  const supabase = createClient()

  const [businessRes, deliveryRes, addressesRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, primary_color')
      .eq('id', params.businessId)
      .eq('is_active', true)
      .single(),
    admin
      .from('delivery_configs')
      .select('*')
      .eq('business_id', params.businessId)
      .maybeSingle(),
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
        backHref={`/shop/${params.businessId}`}
      />

      <main className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-lg font-bold mb-4">Ολοκλήρωση παραγγελίας</h1>
        <CheckoutClient
          businessId={params.businessId}
          primaryColor={businessRes.data.primary_color ?? '#2563eb'}
          customer={customer}
          addresses={addressesRes.data ?? []}
          deliveryConfig={deliveryRes.data ?? null}
          lang="el"
        />
      </main>
    </div>
  )
}
