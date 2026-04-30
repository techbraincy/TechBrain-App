import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-server'
import { OnboardingWizard } from '@/components/voice-agent/OnboardingWizard'
import { LogoutButton } from '@/components/auth/LogoutButton'

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

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body, "Hanken Grotesk", system-ui, sans-serif)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#8A8680',
            pointerEvents: 'auto',
          }}
        >
          {user.email}
        </span>
        <div style={{ pointerEvents: 'auto' }}>
          <LogoutButton />
        </div>
      </div>
      <OnboardingWizard />
    </>
  )
}
