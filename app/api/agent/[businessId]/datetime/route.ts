import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { DAY_NAMES_EL } from '@/lib/utils'
import { requireAgentSecret } from '@/lib/auth/agent-auth'

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const denied = requireAgentSecret(req)
  if (denied) return denied
  const admin = createAdminClient()

  const { data: biz } = await admin
    .from('businesses')
    .select('timezone')
    .eq('id', params.businessId)
    .single()

  const tz = biz?.timezone ?? 'Europe/Athens'
  const now = new Date()

  const formatted = new Intl.DateTimeFormat('el-GR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  // Check if business is open right now
  const dowLocal = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
      .format(now)
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  )

  // Use JS day (0=Sun)
  const jsDow = new Date(now.toLocaleString('en-US', { timeZone: tz })).getDay()
  const timeStr = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now)

  const { data: todayHours } = await admin
    .from('operating_hours')
    .select('is_open, open_time, close_time')
    .eq('business_id', params.businessId)
    .eq('day_of_week', jsDow)
    .single()

  let is_open = false
  if (todayHours?.is_open && todayHours.open_time && todayHours.close_time) {
    is_open = timeStr >= todayHours.open_time.slice(0, 5) && timeStr < todayHours.close_time.slice(0, 5)
  }

  return NextResponse.json({ datetime: formatted, is_open })
}
