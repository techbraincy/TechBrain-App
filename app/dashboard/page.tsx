import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'

/**
 * /dashboard — smart redirect based on how many businesses the user belongs to.
 * One business → go directly to that business dashboard.
 * Multiple → show a business selector (to be built in Phase 9).
 * Zero → onboarding.
 */
export default async function DashboardPage() {
  const session = await requireSession()

  if (session.businesses.length === 0) {
    redirect('/onboarding')
  }

  if (session.businesses.length === 1) {
    redirect('/admin')
  }

  // Multiple businesses — redirect to admin selector
  redirect('/admin/select')
}
