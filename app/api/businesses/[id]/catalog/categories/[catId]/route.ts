import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

interface Ctx { params: { id: string; catId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try { await requireBusinessAccess(params.id) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const allowed = ['name_el', 'name_en', 'sort_order', 'is_active']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) patch[key] = body[key]
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('menu_categories')
    .update(patch)
    .eq('id', params.catId)
    .eq('business_id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try { await requireBusinessAccess(params.id) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('menu_categories')
    .delete()
    .eq('id', params.catId)
    .eq('business_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
