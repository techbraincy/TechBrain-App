import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireAgentSecret } from '@/lib/auth/agent-auth'

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const denied = requireAgentSecret(req)
  if (denied) return denied
  const admin = createAdminClient()

  const [{ data: categories }, { data: items }] = await Promise.all([
    admin.from('menu_categories').select('id, name_el, name_en').eq('business_id', params.businessId).eq('is_active', true).order('sort_order'),
    admin.from('menu_items').select('category_id, name_el, name_en, description_el, price').eq('business_id', params.businessId).eq('is_active', true).eq('is_available', true).order('sort_order'),
  ])

  if (!items?.length) {
    return NextResponse.json({ menu: 'Το μενού δεν είναι διαθέσιμο αυτή τη στιγμή. / Menu is not available at this time.' })
  }

  // Group by category
  const catMap: Record<string, { name: string; items: string[] }> = {}

  for (const item of items) {
    const cat = categories?.find((c) => c.id === item.category_id)
    const catName = cat ? `${cat.name_el}${cat.name_en ? ' / ' + cat.name_en : ''}` : 'Άλλα / Other'

    if (!catMap[catName]) catMap[catName] = { name: catName, items: [] }

    const name = item.name_en ? `${item.name_el} / ${item.name_en}` : item.name_el
    catMap[catName].items.push(`${name}: €${Number(item.price).toFixed(2)}`)
  }

  const sections = Object.values(catMap).map(({ name, items }) => `${name}:\n${items.map((i) => `  - ${i}`).join('\n')}`)

  return NextResponse.json({ menu: sections.join('\n\n') })
}
