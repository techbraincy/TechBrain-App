import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireAgentSecret } from '@/lib/auth/agent-auth'

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const denied = requireAgentSecret(req)
  if (denied) return denied
  const admin = createAdminClient()
  const body  = await req.json().catch(() => ({}))
  const { reference, reason } = body

  if (!reference) {
    return NextResponse.json({ success: false, error: 'Reservation reference is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('reservations')
    .update({ status: 'cancelled', notes: reason ? `Cancelled: ${reason}` : 'Cancelled by caller' } as any)
    .eq('business_id', params.businessId)
    .eq('reference', reference.toUpperCase())
    .not('status', 'in', '("cancelled","completed","no_show")')
    .select('reference')
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Reservation not found or already finalised' }, { status: 404 })
  }

  return NextResponse.json({ success: true, reference: data.reference })
}
