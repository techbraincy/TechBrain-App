import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/db/supabase-server'
import { stripe } from '@/lib/stripe'

export async function POST(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { amount_cents?: unknown; currency?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const amountCents = Math.round(Number(body.amount_cents ?? 0))
  if (!amountCents || amountCents < 50) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Get or create Stripe customer for this user
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('app_customers')
    .select('stripe_customer_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  let stripeCustomerId = profile?.stripe_customer_id ?? null
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      email: user.email,
      name:  `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || undefined,
      metadata: { supabase_user_id: user.id },
    })
    stripeCustomerId = stripeCustomer.id
    await admin
      .from('app_customers')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id)
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   amountCents,
    currency: 'eur',
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      business_id:  params.businessId,
      user_id:      user.id,
    },
  })

  return NextResponse.json({ client_secret: paymentIntent.client_secret })
}
