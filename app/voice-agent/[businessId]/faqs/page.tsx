import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import { FaqsClient } from '@/components/voice-agent/FaqsClient'

interface Props { params: { businessId: string } }

export default async function FaqsPage({ params }: Props) {
  const { business } = await requireBusinessAccess(params.businessId)
  if (!business.features?.faqs_enabled) redirect(`/voice-agent/${params.businessId}`)

  const supabase = createClient()
  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .eq('business_id', params.businessId)
    .order('sort_order')

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Βάση γνώσης</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ο agent θα χρησιμοποιεί αυτές τις ερωτήσεις για να απαντά στους καλούντες.
        </p>
      </div>
      <FaqsClient businessId={params.businessId} initialFaqs={faqs ?? []} />
    </div>
  )
}
