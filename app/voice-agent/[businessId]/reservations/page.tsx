import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { ReservationsClient } from '@/components/voice-agent/ReservationsClient'

interface Props { params: { businessId: string } }

export default async function ReservationsPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId)
  if (!business.features?.reservations_enabled) redirect(`/voice-agent/${params.businessId}`)

  const supabase = createClient()
  const today    = new Date().toISOString().split('T')[0]

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, customer:customers(name, phone)')
    .eq('business_id', params.businessId)
    .gte('reserved_at', `${today}T00:00:00`)
    .order('reserved_at')
    .limit(200)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Κρατήσεις</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Σήμερα · {reservations?.length ?? 0} κρατήσεις
        </p>
      </div>
      <ReservationsClient
        businessId={params.businessId}
        initialReservations={reservations ?? []}
        autoConfirm={false}
      />
    </div>
  )
}
