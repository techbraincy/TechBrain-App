import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { z } from 'zod'

const addressSchema = z.object({
  label:        z.string().min(1).max(60).trim(),
  address_text: z.string().min(3).max(300).trim(),
  lat:          z.number().min(-90).max(90).optional().nullable(),
  lng:          z.number().min(-180).max(180).optional().nullable(),
  instructions: z.string().max(500).trim().optional().nullable(),
  is_default:   z.boolean().default(false),
})

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return NextResponse.json({ addresses: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = addressSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()

  // If setting as default, unset all others first
  if (parsed.data.is_default) {
    await admin
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id)
  }

  const { data, error } = await admin
    .from('customer_addresses')
    .insert({ customer_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ address: data })
}
