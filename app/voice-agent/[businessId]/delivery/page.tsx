import { requireBusinessAccess } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { DeliveryClient } from '@/components/voice-agent/DeliveryClient'

interface Props { params: { businessId: string } }

export default async function DeliveryPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId)

  if (!business.features?.delivery_enabled) {
    redirect(`/voice-agent/${params.businessId}`)
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [ordersResult, configResult] = await Promise.all([
    admin
      .from('orders')
      .select('*, order_items(*), customer:customers(name, phone)')
      .eq('business_id', params.businessId)
      .eq('type', 'delivery')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('delivery_configs')
      .select('*')
      .eq('business_id', params.businessId)
      .maybeSingle(),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Σήμερα · live παρακολούθηση παραγγελιών
        </p>
      </div>
      <DeliveryClient
        businessId={params.businessId}
        initialOrders={(ordersResult.data ?? []) as any}
        features={business.features}
        deliveryConfig={configResult.data ?? null}
        appUrl={appUrl}
      />
    </div>
  )
}
