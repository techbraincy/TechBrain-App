import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id, 'manager').catch(() => ({ session: null, business: null }))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('faqs')
    .insert({
      business_id:  params.id,
      question_el:  body.question_el,
      question_en:  body.question_en ?? null,
      answer_el:    body.answer_el,
      answer_en:    body.answer_en ?? null,
      is_active:    body.is_active ?? true,
      sort_order:   body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ faq: data })
}
