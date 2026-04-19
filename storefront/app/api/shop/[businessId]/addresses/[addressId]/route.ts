import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { z } from 'zod'

const patchSchema = z.object({
  label:        z.string().min(1).max(60).trim().optional(),
  address_text: z.string().min(3).max(300).trim().optional(),
  lat:          z.number().min(-90).max(90).nullable().optional(),
  lng:          z.number().min(-180).max(180).nullable().optional(),
  instructions: z.string().max(500).trim().nullable().optional(),
  is_default:   z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessId: string; addressId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()

  // Verify ownership
  const { data: existing } = await admin
    .from('customer_addresses')
    .select('id, customer_id')
    .eq('id', params.addressId)
    .single()

  if (!existing || existing.customer_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (parsed.data.is_default) {
    await admin.from('customer_addresses').update({ is_default: false }).eq('customer_id', user.id)
  }

  const { data, error } = await admin
    .from('customer_addresses')
    .update(parsed.data)
    .eq('id', params.addressId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ address: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { businessId: string; addressId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('customer_addresses')
    .select('id, customer_id')
    .eq('id', params.addressId)
    .single()

  if (!existing || existing.customer_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await admin.from('customer_addresses').delete().eq('id', params.addressId)
  return NextResponse.json({ ok: true })
}
