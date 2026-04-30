'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

/**
 * Browser-side Supabase client for use in Client Components.
 *
 * True singleton: one instance per browser context. Multiple instances would
 * each register their own cookie listeners and could race when one writes
 * a refreshed token while another reads a stale one.
 */
type BrowserClient = ReturnType<typeof createBrowserClient<Database>>
let browserClient: BrowserClient | null = null

export function createClient(): BrowserClient {
  if (browserClient) return browserClient
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}
