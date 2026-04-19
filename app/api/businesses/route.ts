import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/db/supabase-server'
import { slugify } from '@/lib/utils'
import { buildAgentPayload } from '@/lib/elevenlabs/agent-builder'
import { createAgent } from '@/lib/elevenlabs/client'
import type { OnboardingInput } from '@/types/db'

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: OnboardingInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 2. Generate a unique slug
  let slug = slugify(body.name)
  const { data: existing } = await admin
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) slug = `${slug}-${Date.now()}`

  // 3. Create business record
  const { data: business, error: bizError } = await admin
    .from('businesses')
    .insert({
      slug,
      name:          body.name,
      type:          body.type ?? 'restaurant',
      description:   body.description ?? null,
      email:         body.email ?? null,
      phone:         body.phone ?? null,
      website:       body.website ?? null,
      address:       body.address ?? null,
      city:          body.city ?? null,
      postal_code:   body.postal_code ?? null,
      country:       body.country ?? 'Greece',
      timezone:      body.timezone ?? 'Europe/Athens',
      currency:      'EUR',
      locale:        body.locale ?? 'el',
      primary_color: body.primary_color ?? '#6366f1',
      setup_status:  'in_progress',
    })
    .select()
    .single()

  if (bizError || !business) {
    console.error('[provision] businesses insert:', bizError)
    return NextResponse.json({ error: 'Failed to create business record' }, { status: 500 })
  }

  const businessId = business.id

  // 4. Create owner membership
  const { error: memberError } = await admin
    .from('business_members')
    .insert({ business_id: businessId, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('[provision] business_members insert:', memberError)
    // Best effort — clean up and fail
    await admin.from('businesses').delete().eq('id', businessId)
    return NextResponse.json({ error: 'Failed to assign ownership' }, { status: 500 })
  }

  // 5. Create feature flags
  const features = body.features ?? {}
  const { error: featError } = await admin
    .from('business_features')
    .insert({
      business_id:            businessId,
      orders_enabled:         !!(features.takeaway_enabled || features.delivery_enabled || features.orders_enabled),
      reservations_enabled:   !!features.reservations_enabled,
      takeaway_enabled:       !!features.takeaway_enabled,
      delivery_enabled:       !!features.delivery_enabled,
      staff_approval_enabled: !!features.staff_approval_enabled,
      faqs_enabled:           features.faqs_enabled !== false,
      customer_portal_enabled: true,
      live_tracking_enabled:  !!features.live_tracking_enabled,
    })

  if (featError) console.error('[provision] business_features insert:', featError)

  // 6. Create operating hours
  if (body.operating_hours?.length) {
    const { error: hoursError } = await admin
      .from('operating_hours')
      .insert(
        body.operating_hours.map((h) => ({
          business_id: businessId,
          day_of_week: h.day_of_week,
          is_open:     h.is_open,
          open_time:   h.open_time ?? null,
          close_time:  h.close_time ?? null,
        }))
      )
    if (hoursError) console.error('[provision] operating_hours insert:', hoursError)
  }

  // 7. Create agent config
  const agentInput = body.agent ?? {}
  const { data: agentConfig, error: agentConfigError } = await admin
    .from('agent_configs')
    .insert({
      business_id:               businessId,
      language:                  agentInput.language ?? 'bilingual',
      tone:                      agentInput.tone ?? 'friendly',
      greeting_greek:            agentInput.greeting_greek ?? null,
      greeting_english:          agentInput.greeting_english ?? null,
      agent_name:                agentInput.agent_name ?? 'Assistant',
      custom_instructions:       agentInput.custom_instructions ?? null,
      escalation_enabled:        !!agentInput.escalation_enabled,
      escalation_phone:          agentInput.escalation_phone ?? null,
      sync_status:               'pending',
    })
    .select()
    .single()

  if (agentConfigError) console.error('[provision] agent_configs insert:', agentConfigError)

  // 8. Reservation config (if applicable)
  if (features.reservations_enabled && body.reservation_config) {
    const { error } = await admin.from('reservation_configs').insert({
      business_id:            businessId,
      ...body.reservation_config,
    })
    if (error) console.error('[provision] reservation_configs insert:', error)
  } else if (features.reservations_enabled) {
    // Insert defaults
    await admin.from('reservation_configs').insert({ business_id: businessId })
  }

  // 9. Delivery config (if applicable)
  if (features.delivery_enabled && body.delivery_config) {
    const dc = body.delivery_config
    const { error } = await admin.from('delivery_configs').insert({
      business_id:        businessId,
      delivery_radius_km: Number(dc.delivery_radius_km) || 5,
      min_order_amount:   Number(dc.min_order_amount) || 0,
      delivery_fee:       Number(dc.delivery_fee) || 0,
      free_delivery_above: dc.free_delivery_above != null
        ? Number(dc.free_delivery_above)
        : null,
      estimated_minutes:  Number(dc.estimated_minutes) || 45,
    })
    if (error) console.error('[provision] delivery_configs insert:', error)
  } else if (features.delivery_enabled) {
    await admin.from('delivery_configs').insert({ business_id: businessId })
  }

  // 10. Menu items (with category grouping)
  if (body.menu_items?.length) {
    const categoryMap: Record<string, string> = {}

    for (const item of body.menu_items) {
      const catName = item.category_name_el?.trim()
      if (catName && !categoryMap[catName]) {
        const { data: cat } = await admin
          .from('menu_categories')
          .insert({ business_id: businessId, name_el: catName })
          .select('id')
          .single()
        if (cat) categoryMap[catName] = cat.id
      }
    }

    const { error: menuError } = await admin.from('menu_items').insert(
      body.menu_items.map((item) => ({
        business_id:    businessId,
        category_id:    item.category_name_el ? (categoryMap[item.category_name_el] ?? null) : null,
        name_el:        item.name_el,
        name_en:        item.name_en ?? null,
        description_el: item.description_el ?? null,
        description_en: item.description_en ?? null,
        price:          item.price,
      }))
    )
    if (menuError) console.error('[provision] menu_items insert:', menuError)
  }

  // 11. Shop config (always provisioned)
  const { error: shopError } = await admin
    .from('shop_configs')
    .insert({ business_id: businessId, is_published: true })
  if (shopError) console.error('[provision] shop_configs insert:', shopError)

  // 12. FAQs
  if (body.faqs?.length) {
    const { error: faqError } = await admin.from('faqs').insert(
      body.faqs.map((faq, i) => ({
        business_id:  businessId,
        question_el:  faq.question_el,
        question_en:  faq.question_en ?? null,
        answer_el:    faq.answer_el,
        answer_en:    faq.answer_en ?? null,
        sort_order:   i,
      }))
    )
    if (faqError) console.error('[provision] faqs insert:', faqError)
  }

  // 13. Build and create ElevenLabs agent
  let agentId: string | null = null
  let setupStatus: 'complete' | 'failed' = 'complete'
  let setupError: string | null = null

  if (process.env.ELEVENLABS_API_KEY && agentConfig) {
    try {
      // Fetch everything we just inserted for the agent builder
      const [hoursResult, menuResult, faqResult, resConfigResult, delConfigResult, featResult] = await Promise.all([
        admin.from('operating_hours').select('*').eq('business_id', businessId),
        admin.from('menu_items').select('*').eq('business_id', businessId).eq('is_active', true),
        admin.from('faqs').select('*').eq('business_id', businessId).eq('is_active', true),
        admin.from('reservation_configs').select('*').eq('business_id', businessId).maybeSingle(),
        admin.from('delivery_configs').select('*').eq('business_id', businessId).maybeSingle(),
        admin.from('business_features').select('*').eq('business_id', businessId).single(),
      ])

      const payload = buildAgentPayload({
        business:          business as any,
        features:          featResult.data as any,
        agentConfig:       agentConfig as any,
        hours:             hoursResult.data ?? [],
        menuItems:         menuResult.data ?? [],
        faqs:              faqResult.data ?? [],
        reservationConfig: resConfigResult.data ?? undefined,
        deliveryConfig:    delConfigResult.data ?? undefined,
      })

      agentId = await createAgent(payload)

      // Store agent_id and mark config as synced
      await Promise.all([
        admin.from('businesses').update({ elevenlabs_agent_id: agentId }).eq('id', businessId),
        admin.from('agent_configs').update({
          sync_status:    'synced',
          last_synced_at: new Date().toISOString(),
        }).eq('business_id', businessId),
      ])
    } catch (err: any) {
      console.error('[provision] ElevenLabs agent creation failed:', err.message)
      setupStatus = 'failed'
      setupError  = err.message
      await admin.from('agent_configs').update({
        sync_status: 'failed',
        sync_error:  err.message,
      }).eq('business_id', businessId)
    }
  } else if (!process.env.ELEVENLABS_API_KEY) {
    // No API key configured — skip silently, mark as pending
    setupStatus = 'complete'
  }

  // 14. Update business setup status
  await admin.from('businesses').update({
    setup_status: setupStatus,
    setup_error:  setupError,
  }).eq('id', businessId)

  // Audit log
  await admin.from('audit_log').insert({
    business_id: businessId,
    user_id:     user.id,
    action:      'business.created',
    entity_type: 'business',
    entity_id:   businessId,
    new_data:    { name: body.name, features },
  })

  return NextResponse.json({ businessId, agentId, setupStatus })
}
