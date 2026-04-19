import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'

// Public — no auth required. Returns active menu items with categories.
export async function GET(
  _req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const admin = createAdminClient()

  const [categoriesResult, itemsResult, businessResult, deliveryResult] = await Promise.all([
    admin
      .from('menu_categories')
      .select('*')
      .eq('business_id', params.businessId)
      .eq('is_active', true)
      .order('sort_order'),
    admin
      .from('menu_items')
      .select('*')
      .eq('business_id', params.businessId)
      .eq('is_active', true)
      .eq('is_available', true)
      .order('sort_order'),
    admin
      .from('businesses')
      .select('id, name, type, description, address, city, phone, primary_color, logo_url')
      .eq('id', params.businessId)
      .eq('is_active', true)
      .single(),
    admin
      .from('delivery_configs')
      .select('*')
      .eq('business_id', params.businessId)
      .maybeSingle(),
  ])

  if (!businessResult.data) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  return NextResponse.json({
    business:       businessResult.data,
    categories:     categoriesResult.data ?? [],
    items:          itemsResult.data ?? [],
    deliveryConfig: deliveryResult.data ?? null,
  })
}
