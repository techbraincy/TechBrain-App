import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/db/supabase-server'

export default async function SlugRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data } = await admin.from('businesses').select('id, is_active').eq('slug', slug).maybeSingle()
  if (!data || !data.is_active) notFound()
  redirect(`/shop/${data.id}`)
}
