import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const admin = createAdminClient()
  const body  = await req.json().catch(() => ({}))
  const { customer_name, customer_phone, date, time, party_size, notes, language } = body

  if (!customer_name || !customer_phone || !date || !time || !party_size) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: customer_name, customer_phone, date, time, party_size' },
      { status: 400 }
    )
  }

  // Upsert customer
  let customerId: string | null = null
  if (customer_phone) {
    const { data: customer } = await admin
      .from('customers')
      .upsert(
        { business_id: params.businessId, phone: customer_phone, name: customer_name, language: language ?? 'el' },
        { onConflict: 'business_id,phone', ignoreDuplicates: false }
      )
      .select('id')
      .single()
    customerId = customer?.id ?? null
  }

  // Get config to decide auto_confirm
  const { data: config } = await admin
    .from('reservation_configs')
    .select('auto_confirm, slot_duration_minutes')
    .eq('business_id', params.businessId)
    .single()

  // Generate reference
  const { data: refResult } = await admin.rpc('generate_reservation_reference', { p_business_id: params.businessId })
  const reference = refResult ?? `RES-${Date.now()}`

  const autoConfirm = config?.auto_confirm ?? false
  const status      = autoConfirm ? 'confirmed' : 'pending'
  const reservedAt  = `${date}T${time}:00`

  const { data: reservation, error } = await admin
    .from('reservations')
    .insert({
      business_id:       params.businessId,
      customer_id:       customerId,
      reference,
      status,
      source:            'phone',
      reserved_at:       reservedAt,
      party_size:        Number(party_size),
      duration_minutes:  config?.slot_duration_minutes ?? 60,
      customer_name,
      customer_phone,
      preferred_language: language ?? 'el',
      notes:             notes ?? null,
    })
    .select('reference, status')
    .single()

  if (error || !reservation) {
    console.error('[agent/reservation]', error)
    return NextResponse.json({ success: false, error: 'Failed to create reservation' }, { status: 500 })
  }

  const confirmMsg = autoConfirm
    ? (language === 'en'
        ? `Your reservation is confirmed for ${date} at ${time} for ${party_size} people. Reference: ${reference}`
        : `Η κράτησή σας επιβεβαιώθηκε για ${date} στις ${time} για ${party_size} άτομα. Αριθμός: ${reference}`)
    : (language === 'en'
        ? `Your reservation request for ${date} at ${time} for ${party_size} people has been received. Reference: ${reference}. We will confirm shortly.`
        : `Το αίτημα κράτησης για ${date} στις ${time} για ${party_size} άτομα ελήφθη. Αριθμός: ${reference}. Θα επιβεβαιωθεί σύντομα.`)

  return NextResponse.json({ success: true, reference, status, message: confirmMsg })
}
