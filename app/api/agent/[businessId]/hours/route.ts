import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { DAY_NAMES_EL, DAY_NAMES_EN } from '@/lib/utils'
import { requireAgentSecret } from '@/lib/auth/agent-auth'

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const denied = requireAgentSecret(req)
  if (denied) return denied
  const admin = createAdminClient()

  const { data: hours, error } = await admin
    .from('operating_hours')
    .select('*')
    .eq('business_id', params.businessId)
    .order('day_of_week')

  if (error || !hours) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ORDER = [1, 2, 3, 4, 5, 6, 0]
  const sorted = [...hours].sort((a, b) => ORDER.indexOf(a.day_of_week) - ORDER.indexOf(b.day_of_week))

  const lines = sorted.map((h) => {
    const el = DAY_NAMES_EL[h.day_of_week]
    const en = DAY_NAMES_EN[h.day_of_week]
    if (!h.is_open || !h.open_time || !h.close_time) {
      return `${el}/${en}: Κλειστά/Closed`
    }
    return `${el}/${en}: ${String(h.open_time).slice(0, 5)}–${String(h.close_time).slice(0, 5)}`
  })

  return NextResponse.json({ hours: lines.join(', ') })
}
