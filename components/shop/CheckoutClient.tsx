'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/shop/CartContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  MapPin, Package, Truck, Tag, ChevronRight,
  CreditCard, Banknote, Check, Loader2, Plus,
} from 'lucide-react'
import type { CustomerAddress, ShopCustomer } from '@/lib/shop/auth'
import type { DeliveryConfig } from '@/types/db'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const TIP_OPTIONS = [0, 0.5, 1, 2]
const SERVICE_FEE = 0.30

interface CouponResult {
  id: string; code: string; type: string; value: number; discount: number
}

interface Props {
  businessId:     string
  primaryColor:   string
  customer:       ShopCustomer
  addresses:      CustomerAddress[]
  deliveryConfig: DeliveryConfig | null
  lang:           'el' | 'en'
}

export function CheckoutClient(props: Props) {
  return stripePromise ? (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  ) : (
    <CheckoutForm {...props} />
  )
}

function CheckoutForm({ businessId, primaryColor, customer, addresses, deliveryConfig, lang }: Props) {
  const router  = useRouter()
  const stripe  = useStripe()
  const elements = useElements()
  const {
    items, fulfillment_type, tip_amount, subtotal, itemCount,
    order_notes, driver_comment, address_id, coupon_code,
    setFulfillment, setAddress, setOrderNotes, setDriverComment, setTip, setCoupon, clearCart,
  } = useCart()

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [couponInput, setCouponInput]     = useState(coupon_code ?? '')
  const [couponResult, setCouponResult]   = useState<CouponResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError]     = useState<string | null>(null)
  const [placing, setPlacing]             = useState(false)

  const selectedAddress = addresses.find((a) => a.id === address_id) ?? addresses.find((a) => a.is_default) ?? addresses[0] ?? null

  // Auto-select default address
  useEffect(() => {
    if (!address_id && addresses.length > 0) {
      setAddress(addresses.find((a) => a.is_default)?.id ?? addresses[0].id)
    }
  }, [addresses]) // eslint-disable-line react-hooks/exhaustive-deps

  const deliveryFee = (() => {
    if (fulfillment_type !== 'delivery' || !deliveryConfig) return 0
    if (deliveryConfig.free_delivery_above && subtotal >= Number(deliveryConfig.free_delivery_above)) return 0
    return Number(deliveryConfig.delivery_fee)
  })()

  const couponDiscount = couponResult?.discount ?? 0
  const total = Math.max(0, subtotal + SERVICE_FEE + deliveryFee + tip_amount - couponDiscount)
  const totalCents = Math.round(total * 100)

  async function validateCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res  = await fetch(`/api/shop/${businessId}/coupons/validate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: couponInput.trim(), subtotal }),
      })
      const json = await res.json()
      if (!res.ok || !json.valid) {
        setCouponError(json.error ?? 'Μη έγκυρος κωδικός')
        setCoupon(null)
        setCouponResult(null)
      } else {
        setCoupon(json.coupon.code)
        setCouponResult(json.coupon)
      }
    } catch {
      setCouponError('Σφάλμα επαλήθευσης')
    } finally {
      setCouponLoading(false)
    }
  }

  async function handlePlaceOrder() {
    if (items.length === 0) return
    if (fulfillment_type === 'delivery' && !selectedAddress) {
      toast.error('Επιλέξτε διεύθυνση delivery')
      return
    }

    setPlacing(true)
    let paymentReference: string | null = null

    // Handle card payment via Stripe
    if (paymentMethod === 'card') {
      if (!stripe || !elements) {
        toast.error('Το Stripe δεν είναι διαθέσιμο')
        setPlacing(false)
        return
      }
      try {
        const intentRes = await fetch(`/api/shop/${businessId}/payment/intent`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount_cents: totalCents }),
        })
        const { client_secret } = await intentRes.json()

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) throw new Error('Card element not found')

        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: { card: cardElement },
        })
        if (error) {
          toast.error(error.message ?? 'Σφάλμα πληρωμής')
          setPlacing(false)
          return
        }
        paymentReference = paymentIntent?.id ?? null
      } catch (err: any) {
        toast.error(err.message)
        setPlacing(false)
        return
      }
    }

    // Place the order
    try {
      const res = await fetch(`/api/shop/${businessId}/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fulfillment_type,
          items: items.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: i.notes })),
          order_notes,
          driver_comment,
          tip_amount,
          coupon_code: couponResult?.code ?? null,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          address_id: selectedAddress?.id ?? null,
          delivery_address: selectedAddress?.address_text ?? null,
          address_lat: selectedAddress?.lat ?? null,
          address_lng: selectedAddress?.lng ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Σφάλμα')

      clearCart()
      toast.success('Η παραγγελία σας ελήφθη!')
      router.push(`/shop/${businessId}/orders/${json.order.id}`)
    } catch (err: any) {
      toast.error(err.message)
      setPlacing(false)
    }
  }

  if (itemCount === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground">Το καλάθι σας είναι άδειο.</p>
        <Button variant="outline" onClick={() => router.push(`/shop/${businessId}`)}>
          Πίσω στο μενού
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Fulfillment */}
      <section className="rounded-xl border border-border overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setFulfillment('takeaway')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              fulfillment_type === 'takeaway' ? 'text-white' : 'text-muted-foreground bg-background')}
            style={fulfillment_type === 'takeaway' ? { backgroundColor: primaryColor } : {}}
          >
            <Package className="size-4" /> Takeaway
          </button>
          <button
            onClick={() => setFulfillment('delivery')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              fulfillment_type === 'delivery' ? 'text-white' : 'text-muted-foreground bg-background')}
            style={fulfillment_type === 'delivery' ? { backgroundColor: primaryColor } : {}}
          >
            <Truck className="size-4" /> Delivery
          </button>
        </div>
      </section>

      {/* Delivery address */}
      {fulfillment_type === 'delivery' && (
        <section className="rounded-xl border border-border p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="size-4" /> Διεύθυνση delivery</h3>
          {addresses.length === 0 ? (
            <a href={`/shop/${businessId}/addresses`} className="text-sm text-primary flex items-center gap-1 hover:underline">
              <Plus className="size-4" /> Προσθήκη διεύθυνσης
            </a>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setAddress(addr.id)}
                  className={cn('w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors',
                    address_id === addr.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{addr.label}</span>
                    {address_id === addr.id && <Check className="size-4" style={{ color: primaryColor }} />}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5 truncate">{addr.address_text}</p>
                </button>
              ))}
              <a href={`/shop/${businessId}/addresses`} className="text-xs text-primary flex items-center gap-1 hover:underline pt-1">
                <Plus className="size-3" /> Προσθήκη νέας διεύθυνσης
              </a>
            </div>
          )}
        </section>
      )}

      {/* Items summary */}
      <section className="rounded-xl border border-border divide-y divide-border">
        {items.map((item) => {
          const name = lang === 'en' && item.name_en ? item.name_en : item.name_el
          return (
            <div key={item.menu_item_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{item.quantity}× {name}</span>
              <span className="tabular-nums font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          )
        })}
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label>Σχόλια παραγγελίας</Label>
          <Input
            placeholder="π.χ. χωρίς κρεμμύδι, αλλεργίες..."
            value={order_notes ?? ''}
            onChange={(e) => setOrderNotes(e.target.value || null)}
          />
        </div>
        {fulfillment_type === 'delivery' && (
          <div className="space-y-1.5">
            <Label>Οδηγίες για τον διανομέα</Label>
            <Input
              placeholder="π.χ. 2ος όροφος, κτυπήστε κουδούνι..."
              value={driver_comment ?? ''}
              onChange={(e) => setDriverComment(e.target.value || null)}
            />
          </div>
        )}
      </section>

      {/* Tip */}
      <section className="space-y-2">
        <Label>Φιλοδώρημα διανομέα</Label>
        <div className="flex gap-2">
          {TIP_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTip(t)}
              className={cn('flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                tip_amount === t ? 'text-white border-transparent' : 'border-border text-muted-foreground')}
              style={tip_amount === t ? { backgroundColor: primaryColor } : {}}
            >
              {t === 0 ? 'Χωρίς' : `€${t.toFixed(2)}`}
            </button>
          ))}
        </div>
      </section>

      {/* Coupon */}
      <section className="space-y-2">
        <Label className="flex items-center gap-1.5"><Tag className="size-3.5" /> Κωδικός έκπτωσης</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Εισάγετε κωδικό"
            value={couponInput}
            onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(null) }}
            className="uppercase"
          />
          <Button
            variant="outline"
            onClick={validateCoupon}
            disabled={couponLoading || !couponInput.trim()}
            className="shrink-0"
          >
            {couponLoading ? <Loader2 className="size-4 animate-spin" /> : 'Εφαρμογή'}
          </Button>
        </div>
        {couponError && <p className="text-xs text-destructive">{couponError}</p>}
        {couponResult && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <Check className="size-3" /> Έκπτωση -{formatCurrency(couponResult.discount)} εφαρμόστηκε
          </p>
        )}
      </section>

      {/* Payment */}
      <section className="space-y-2">
        <Label>Τρόπος πληρωμής</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={cn('rounded-xl border p-3 flex flex-col items-center gap-1.5 text-sm font-medium transition-colors',
              paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}
          >
            <Banknote className="size-5" /> Μετρητά
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            className={cn('rounded-xl border p-3 flex flex-col items-center gap-1.5 text-sm font-medium transition-colors',
              paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}
          >
            <CreditCard className="size-5" /> Κάρτα
          </button>
        </div>
        {paymentMethod === 'card' && stripePromise && (
          <div className="rounded-xl border border-border p-3 mt-2">
            <CardElement options={{ style: { base: { fontSize: '14px' } } }} />
          </div>
        )}
        {paymentMethod === 'card' && !stripePromise && (
          <p className="text-xs text-amber-600">Το Stripe δεν έχει ρυθμιστεί. Επιλέξτε πληρωμή με μετρητά.</p>
        )}
      </section>

      {/* Fee summary */}
      <section className="rounded-xl bg-muted/40 divide-y divide-border">
        {[
          ['Υποσύνολο', formatCurrency(subtotal)],
          ['Χρέωση εφαρμογής', formatCurrency(SERVICE_FEE)],
          ...(fulfillment_type === 'delivery' ? [['Delivery', deliveryFee === 0 ? 'Δωρεάν' : formatCurrency(deliveryFee)]] : []),
          ...(tip_amount > 0 ? [['Φιλοδώρημα', formatCurrency(tip_amount)]] : []),
          ...(couponDiscount > 0 ? [['Έκπτωση κουπονιού', `-${formatCurrency(couponDiscount)}`]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between px-3 py-2 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={couponDiscount > 0 && label === 'Έκπτωση κουπονιού' ? 'text-emerald-600 font-medium' : ''}>{value}</span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-3 text-base font-bold">
          <span>Σύνολο</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </section>

      {/* Place order */}
      <Button
        className="w-full h-12 rounded-xl text-base font-semibold"
        style={{ backgroundColor: primaryColor }}
        onClick={handlePlaceOrder}
        disabled={placing || (fulfillment_type === 'delivery' && !selectedAddress)}
      >
        {placing ? (
          <><Loader2 className="size-4 animate-spin mr-2" /> Επεξεργασία…</>
        ) : (
          <>Παραγγελία · {formatCurrency(total)} <ChevronRight className="size-4 ml-1" /></>
        )}
      </Button>
    </div>
  )
}
