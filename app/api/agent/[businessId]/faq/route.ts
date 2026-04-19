import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const admin = createAdminClient()
  const body  = await req.json().catch(() => ({}))
  const query = (body.question ?? '').toLowerCase().trim()

  const { data: faqs } = await admin
    .from('faqs')
    .select('question_el, question_en, answer_el, answer_en')
    .eq('business_id', params.businessId)
    .eq('is_active', true)

  if (!faqs?.length) {
    return NextResponse.json({ answer: null })
  }

  // Simple keyword match — find the best matching FAQ
  const scored = faqs.map((faq) => {
    const qEl = (faq.question_el ?? '').toLowerCase()
    const qEn = (faq.question_en ?? '').toLowerCase()
    const words = query.split(/\s+/).filter((w: string) => w.length > 2)
    const score = words.filter((w: string) => qEl.includes(w) || qEn.includes(w)).length
    return { faq, score }
  })

  const best = scored.sort((a, b) => b.score - a.score)[0]

  if (!best || best.score === 0) {
    return NextResponse.json({ answer: null })
  }

  const ansEl = best.faq.answer_el
  const ansEn = best.faq.answer_en

  const answer = ansEl && ansEn ? `${ansEl} / ${ansEn}` : ansEl ?? ansEn ?? null

  return NextResponse.json({ answer })
}
