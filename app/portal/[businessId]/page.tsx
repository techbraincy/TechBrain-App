import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { PortalClient } from '@/components/portal/PortalClient'

interface Props { params: { businessId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const admin = createAdminClient()
  const { data: biz } = await admin
    .from('businesses')
    .select('name')
    .eq('id', params.businessId)
    .single()

  return { title: biz ? `${biz.name} — Παρακολούθηση παραγγελίας` : 'Παρακολούθηση παραγγελίας' }
}

export default async function PortalPage({ params }: Props) {
  const admin = createAdminClient()
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, primary_color, accent_color, logo_url, phone, features:business_features(*)')
    .eq('id', params.businessId)
    .eq('is_active', true)
    .single()

  if (!business) notFound()

  return <PortalClient business={business as any} />
}
