import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireBusinessAccess(params.id)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shop_configs')
    .select('*')
    .eq('business_id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create if missing (backfill for existing businesses)
  if (!data) {
    const { data: created, error: createErr } = await admin
      .from('shop_configs')
      .insert({ business_id: params.id, is_published: true })
      .select()
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    return NextResponse.json(created)
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireBusinessAccess(params.id)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const allowed = [
    'is_published', 'cover_image_url', 'announcement', 'seo_title', 'seo_description',
    'subtitle', 'logo_url', 'hero_tagline', 'banners',
  ]
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Upsert: create if not exists
  const { data: existing } = await admin
    .from('shop_configs')
    .select('id')
    .eq('business_id', params.id)
    .maybeSingle()

  if (!existing) {
    const { data, error } = await admin
      .from('shop_configs')
      .insert({ business_id: params.id, ...patch })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await admin
    .from('shop_configs')
    .update(patch)
    .eq('business_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
