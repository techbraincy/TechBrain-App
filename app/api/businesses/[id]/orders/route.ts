import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url    = new URL(req.url)
  const status = url.searchParams.get('status')
  const date   = url.searchParams.get('date')   // YYYY-MM-DD
  const limit  = Number(url.searchParams.get('limit') ?? '50')

  const supabase = createClient()
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (*),
      customer:customers (id, name, phone)
    `)
    .eq('business_id', params.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (date)   query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: data })
}
