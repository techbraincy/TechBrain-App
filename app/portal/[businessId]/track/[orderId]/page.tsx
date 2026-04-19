import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/db/supabase-server'
import { notFound } from 'next/navigation'
import { OrderTrackingClient } from '@/components/portal/OrderTrackingClient'
import { geocodeAddress } from '@/lib/geocode'

interface Props { params: { businessId: string; orderId: string } }

export const metadata: Metadata = { title: 'Κατάσταση παραγγελίας' }

export default async function TrackOrderPage({ params }: Props) {
  const admin = createAdminClient()
  const ref   = params.orderId.toUpperCase()
  const isReservation = ref.startsWith('RES-')

  let record: any = null
  let type: 'order' | 'reservation' = 'order'

  if (isReservation) {
    const { data } = await admin
      .from('reservations')
      .select('*, business:businesses(name, primary_color, phone, address, city)')
      .eq('reference', ref)
      .eq('business_id', params.businessId)
      .single()
    record = data
    type   = 'reservation'
  } else {
    const { data } = await admin
      .from('orders')
      .select('*, order_items(*), business:businesses(name, primary_color, phone, address, city)')
      .eq('reference', ref)
      .eq('business_id', params.businessId)
      .single()
    record = data
    type   = 'order'
  }

  if (!record) notFound()

  // Geocode addresses server-side for delivery orders (cached 24h by Next.js fetch)
  let pickupCoords:      [number, number] | null = null
  let destinationCoords: [number, number] | null = null

  if (type === 'order' && record.type === 'delivery') {
    const biz = record.business
    const pickupQuery      = [biz?.address, biz?.city].filter(Boolean).join(', ')
    const destinationQuery = record.delivery_address

    const [pickup, destination] = await Promise.all([
      pickupQuery      ? geocodeAddress(pickupQuery)      : Promise.resolve(null),
      destinationQuery ? geocodeAddress(destinationQuery) : Promise.resolve(null),
    ])

    pickupCoords      = pickup
    destinationCoords = destination
  }

  return (
    <OrderTrackingClient
      record={record}
      type={type}
      pickupCoords={pickupCoords}
      destinationCoords={destinationCoords}
    />
  )
}
