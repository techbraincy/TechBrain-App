import { createClient } from '@/lib/db/supabase-server'
import { redirect } from 'next/navigation'
export type { CustomerAddress } from '@/types/db'

export interface ShopCustomer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  preferred_language: string
  notify_order_updates: boolean
  notify_promotions: boolean
  stripe_customer_id: string | null
}

/**
 * Returns the logged-in customer with their app profile.
 * Returns null if not authenticated or profile not yet created.
 */
export async function getShopCustomer(businessId?: string): Promise<ShopCustomer | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('app_customers')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email ?? '',
    first_name: profile.first_name ?? '',
    last_name:  profile.last_name  ?? '',
    phone:      profile.phone ?? null,
    preferred_language:   profile.preferred_language ?? 'el',
    notify_order_updates: profile.notify_order_updates ?? true,
    notify_promotions:    profile.notify_promotions ?? false,
    stripe_customer_id:   profile.stripe_customer_id ?? null,
  }
}

/**
 * Requires an authenticated customer — redirects to shop login if not.
 */
export async function requireShopCustomer(businessId: string): Promise<ShopCustomer> {
  const customer = await getShopCustomer(businessId)
  if (!customer) redirect(`/shop/${businessId}/auth`)
  return customer
}
