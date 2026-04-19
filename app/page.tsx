import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-server'

/**
 * Root route: redirect authenticated users to their dashboard,
 * unauthenticated users to the login page.
 */
export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has any business
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}
