import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/db/supabase-server'

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''
  const secret    = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err: any) {
    console.error('[stripe/webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi     = event.data.object as import('stripe').Stripe.PaymentIntent
    const bizId  = pi.metadata?.business_id
    const userId = pi.metadata?.user_id

    if (bizId && userId) {
      const admin = createAdminClient()
      // Mark any pending order with this payment reference as accepted
      await admin
        .from('orders')
        .update({ status: 'accepted', payment_reference: pi.id })
        .eq('business_id', bizId)
        .eq('app_customer_id', userId)
        .eq('payment_reference', pi.id)
    }
  }

  return NextResponse.json({ received: true })
}
