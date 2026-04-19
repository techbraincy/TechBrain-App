import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try { await requireBusinessAccess(params.id) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('menu_categories')
    .select('*')
    .eq('business_id', params.id)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try { await requireBusinessAccess(params.id) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  if (!body.name_el?.trim()) return NextResponse.json({ error: 'name_el required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: last } = await admin
    .from('menu_categories')
    .select('sort_order')
    .eq('business_id', params.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('menu_categories')
    .insert({
      business_id: params.id,
      name_el:     body.name_el.trim(),
      name_en:     body.name_en?.trim() ?? null,
      sort_order:  (last?.sort_order ?? -1) + 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
