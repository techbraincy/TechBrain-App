import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-server'
import { OnboardingWizard } from '@/components/voice-agent/OnboardingWizard'

export const metadata: Metadata = { title: 'Ρύθμιση επιχείρησης' }

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If already has a business, skip onboarding
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership) redirect('/dashboard')

  return <OnboardingWizard />
}
