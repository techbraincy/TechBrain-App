import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { BusinessSettingsClient } from '@/components/voice-agent/BusinessSettingsClient'

interface Props { params: { businessId: string } }

export default async function SettingsPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId, 'manager')
  const supabase = createClient()

  const [{ data: hours }, { data: members }] = await Promise.all([
    supabase.from('operating_hours').select('*').eq('business_id', params.businessId).order('day_of_week'),
    supabase
      .from('business_members')
      .select('*, profile:profiles(full_name, email, avatar_url)')
      .eq('business_id', params.businessId),
  ])

  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ρυθμίσεις</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Διαχείριση επιχείρησης, ωραρίου και ομάδας</p>
      </div>
      <BusinessSettingsClient
        business={business}
        initialHours={hours ?? []}
        members={members ?? []}
      />
    </div>
  )
}
