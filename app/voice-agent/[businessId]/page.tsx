import { redirect } from 'next/navigation'

// Overview removed — dashboard root goes straight to Orders.
export default function BusinessRootPage({ params }: { params: { businessId: string } }) {
  redirect(`/voice-agent/${params.businessId}/orders`)
}
