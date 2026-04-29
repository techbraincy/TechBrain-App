import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import type { Session } from '@/lib/auth/session'
import type { BusinessWithMembership } from '@/types/db'

export interface AdminSession {
  session: Session
  business: BusinessWithMembership
}

const COOKIE_NAME = 'admin_business_id'

/**
 * Pure function — matches a cookie value against the verified membership list.
 * Returns null if the value is absent, empty, or not found in the list.
 * No I/O. No side effects. Never writes anything.
 */
export function resolveBusiness(
  businesses: BusinessWithMembership[],
  cookieValue: string | undefined,
): BusinessWithMembership | null {
  if (!cookieValue) return null
  return businesses.find((b) => b.id === cookieValue) ?? null
}

/**
 * Resolves the active business for the current admin session.
 *
 * Resolution rules:
 *   - 0 businesses → redirect /onboarding
 *   - 1 business   → use it directly; no cookie required or written
 *   - N businesses, valid admin_business_id cookie → use resolved business
 *   - N businesses, no/invalid cookie → redirect /admin/select
 *
 * Never writes a cookie. Cookie writes happen only in selectBusiness() Server Action.
 * Safe to call inside RSC layouts and pages.
 *
 * Wrapped in React.cache so multiple calls within the same request share one result.
 */
export const requireAdminSession: () => Promise<AdminSession> = cache(async () => {
  const t0 = Date.now()
  const session = await requireSession()
  const sessionMs = Date.now() - t0

  if (session.businesses.length === 0) {
    redirect('/onboarding')
  }

  if (session.businesses.length === 1) {
    const bid = session.businesses[0].id.slice(0, 6)
    console.log(`[ADMIN_PERF] requireAdminSession requireSession=${sessionMs}ms bid=${bid}.. (single-business fast path)`)
    return { session, business: session.businesses[0] }
  }

  // Multi-business: read cookie (read-only — safe in RSC)
  const cookieStore = cookies()
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value
  const business = resolveBusiness(session.businesses, cookieValue)

  if (!business) {
    redirect('/admin/select')
  }

  const bid = business.id.slice(0, 6)
  console.log(`[ADMIN_PERF] requireAdminSession requireSession=${sessionMs}ms bid=${bid}.. (cookie resolved)`)
  return { session, business }
})
