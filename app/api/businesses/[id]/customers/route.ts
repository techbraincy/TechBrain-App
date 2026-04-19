import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, email, notes, total_orders, total_reservations, last_seen_at, created_at')
    .eq('business_id', params.id)
    .order('last_seen_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customers: data ?? [] })
}
