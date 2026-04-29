'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'

const COOKIE_NAME = 'admin_business_id'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/admin',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

/**
 * Validates that businessId belongs to the current user's memberships,
 * writes the admin_business_id cookie, then redirects to /admin.
 * Cookie is written here — the only place this happens in the whole app.
 */
export async function selectBusiness(businessId: string): Promise<never> {
  const session = await requireSession()

  const business = session.businesses.find((b) => b.id === businessId)
  if (!business) {
    throw new Error('Unauthorized: not a member of this business')
  }

  cookies().set(COOKIE_NAME, business.id, COOKIE_OPTIONS)
  redirect('/admin')
}

/**
 * Clears the active business selection and sends the user back to the selector.
 */
export async function clearBusinessSelection(): Promise<never> {
  await requireSession()
  cookies().delete(COOKIE_NAME)
  redirect('/admin/select')
}
