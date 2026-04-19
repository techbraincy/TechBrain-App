import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { ReservationsClient } from '@/components/voice-agent/ReservationsClient'
import { OrdersClient } from '@/components/voice-agent/OrdersClient'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck } from 'lucide-react'

interface Props { params: { businessId: string } }

export default async function ApprovalsPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId)
  if (!business.features?.staff_approval_enabled) redirect(`/voice-agent/${params.businessId}`)

  const supabase = createClient()

  const [{ data: pendingOrders }, { data: pendingRes }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(*), customer:customers(name, phone)')
      .eq('business_id', params.businessId)
      .eq('status', 'awaiting_approval')
      .order('created_at'),
    supabase
      .from('reservations')
      .select('*, customer:customers(name, phone)')
      .eq('business_id', params.businessId)
      .eq('status', 'pending')
      .order('reserved_at'),
  ])

  const total = (pendingOrders?.length ?? 0) + (pendingRes?.length ?? 0)

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Εγκρίσεις</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Εκκρεμείς ενέργειες που χρειάζονται απόφαση</p>
        </div>
        {total > 0 && (
          <Badge variant="warning" className="ml-auto">{total} εκκρεμείς</Badge>
        )}
      </div>

      {pendingOrders && pendingOrders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Παραγγελίες ({pendingOrders.length})</h2>
          <OrdersClient
            businessId={params.businessId}
            initialOrders={pendingOrders as any}
            features={business.features}
          />
        </section>
      )}

      {pendingRes && pendingRes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Κρατήσεις ({pendingRes.length})</h2>
          <ReservationsClient
            businessId={params.businessId}
            initialReservations={pendingRes as any}
            autoConfirm={false}
          />
        </section>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <ClipboardCheck className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Δεν υπάρχουν εκκρεμείς εγκρίσεις</p>
          <p className="text-xs text-muted-foreground mt-1">Θα εμφανιστούν εδώ μόλις ο agent δεχθεί παραγγελίες ή κρατήσεις.</p>
        </div>
      )}
    </div>
  )
}
