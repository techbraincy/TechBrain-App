import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { businessId: string; orderId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select(`
      *,
      order_items (*),
      business:businesses (name, address, city, phone, primary_color),
      status_history:order_status_history (*)
    `)
    .eq('id', params.orderId)
    .eq('business_id', params.businessId)
    .eq('app_customer_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({ order })
}
