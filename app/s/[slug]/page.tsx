import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/db/supabase-server'

export default async function SlugRedirectPage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('businesses')
    .select('id, is_active')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!data || !data.is_active) notFound()

  redirect(`/shop/${data.id}`)
}
