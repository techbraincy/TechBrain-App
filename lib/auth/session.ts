import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
import type { BusinessWithMembership, BusinessRole } from '@/types/db'

export interface SessionUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface Session {
  user: SessionUser
  businesses: BusinessWithMembership[]
}

/**
 * Returns the current authenticated user from Supabase Auth.
 * Returns null if not authenticated — does NOT redirect.
 */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? '',
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  }
}

/**
 * Returns the current user and their business memberships.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Use admin client for membership query to bypass self-referencing RLS on business_members.
  // User identity is already verified above via supabase.auth.getUser().
  const admin = createAdminClient()

  const [profileResult, membershipsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single(),
    admin
      .from('business_members')
      .select(`
        role,
        businesses (
          *,
          business_features (*)
        )
      `)
      .eq('user_id', user.id),
  ])

  const businesses: BusinessWithMembership[] = (membershipsResult.data ?? [])
    .filter((m) => m.businesses !== null)
    .map((m) => {
      const b = m.businesses as any
      // business_features is a 1:1 relation returned as array or object depending on Supabase version
      const feat = Array.isArray(b.business_features)
        ? (b.business_features[0] ?? null)
        : (b.business_features ?? null)
      return {
        ...b,
        role: m.role as BusinessRole,
        features: feat,
      }
    })

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      full_name: profileResult.data?.full_name ?? null,
      avatar_url: profileResult.data?.avatar_url ?? null,
    },
    businesses,
  }
}

/**
 * Requires an authenticated session — redirects to /login if none exists.
 * Use at the top of protected Server Components.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Requires the user to be a member of a specific business.
 * Redirects to /dashboard if they're not.
 */
export async function requireBusinessAccess(
  businessId: string,
  minRole?: BusinessRole
): Promise<{ session: Session; business: BusinessWithMembership }> {
  const session = await requireSession()

  const business = session.businesses.find((b) => b.id === businessId)

  if (!business) redirect('/dashboard')

  if (minRole) {
    const roleOrder: Record<BusinessRole, number> = { owner: 3, manager: 2, staff: 1 }
    if (roleOrder[business.role] < roleOrder[minRole]) redirect(`/voice-agent/${businessId}`)
  }

  return { session, business }
}
