import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; faqId: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const update: Record<string, unknown> = {}
  if (body.question_el !== undefined) update.question_el = body.question_el
  if (body.question_en !== undefined) update.question_en = body.question_en ?? null
  if (body.answer_el   !== undefined) update.answer_el   = body.answer_el
  if (body.answer_en   !== undefined) update.answer_en   = body.answer_en ?? null
  if (body.is_active   !== undefined) update.is_active   = body.is_active
  if (body.sort_order  !== undefined) update.sort_order  = body.sort_order

  const { data, error } = await admin
    .from('faqs')
    .update(update)
    .eq('id', params.faqId)
    .eq('business_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ faq: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; faqId: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('faqs')
    .delete()
    .eq('id', params.faqId)
    .eq('business_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
