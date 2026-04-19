import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { UnifiedOrdersClient } from '@/components/voice-agent/UnifiedOrdersClient'

interface Props { params: { businessId: string } }

export default async function OrdersPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId)

  if (!business.features?.orders_enabled && !business.features?.takeaway_enabled && !business.features?.delivery_enabled) {
    redirect(`/voice-agent/${params.businessId}`)
  }

  const supabase = createClient()
  const today    = new Date().toISOString().split('T')[0]

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items ( *, menu_items ( name_el, image_url ) ),
      customer:customers ( name, phone )
    `)
    .eq('business_id', params.businessId)
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Παραγγελίες</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Σήμερα · {orders?.length ?? 0} παραγγελίες</p>
      </div>
      <UnifiedOrdersClient
        businessId={params.businessId}
        initialOrders={orders ?? []}
        features={business.features}
      />
    </div>
  )
}
