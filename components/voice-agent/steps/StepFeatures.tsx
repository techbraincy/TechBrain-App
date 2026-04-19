'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CalendarDays, ShoppingBag, Truck, ClipboardCheck,
  MessageCircleQuestion, MapPin, Check,
} from 'lucide-react'
import type { OnboardingInput } from '@/types/db'

type FeatureKey = keyof OnboardingInput['features']

interface FeatureOption {
  key: FeatureKey
  icon: React.ElementType
  title_el: string
  title_en: string
  desc_el: string
  desc_en: string
  recommended?: boolean
}

const FEATURES: FeatureOption[] = [
  {
    key: 'reservations_enabled',
    icon: CalendarDays,
    title_el: 'Κρατήσεις',
    title_en: 'Reservations',
    desc_el: 'Ο agent δέχεται, ακυρώνει και αλλάζει κρατήσεις τραπεζιού.',
    desc_en: 'Accept, cancel and reschedule table bookings.',
    recommended: true,
  },
  {
    key: 'takeaway_enabled',
    icon: ShoppingBag,
    title_el: 'Takeaway',
    title_en: 'Takeaway',
    desc_el: 'Παραγγελίες για παραλαβή από το κατάστημα.',
    desc_en: 'Orders for collection from the premises.',
    recommended: true,
  },
  {
    key: 'delivery_enabled',
    icon: Truck,
    title_el: 'Delivery',
    title_en: 'Delivery',
    desc_el: 'Παραγγελίες με διανομή στην πόρτα του πελάτη.',
    desc_en: 'Orders delivered to the customer\'s address.',
  },
  {
    key: 'staff_approval_enabled',
    icon: ClipboardCheck,
    title_el: 'Έγκριση παραγγελιών',
    title_en: 'Staff approval',
    desc_el: 'Παραγγελίες και κρατήσεις χρειάζονται έγκριση πριν επιβεβαιωθούν.',
    desc_en: 'Orders and reservations require staff confirmation.',
  },
  {
    key: 'faqs_enabled',
    icon: MessageCircleQuestion,
    title_el: 'Συχνές ερωτήσεις',
    title_en: 'FAQs',
    desc_el: 'Ο agent απαντά σε συνηθισμένες ερωτήσεις για την επιχείρηση.',
    desc_en: 'Agent answers common questions about the business.',
    recommended: true,
  },
  {
    key: 'live_tracking_enabled',
    icon: MapPin,
    title_el: 'Live tracking παραγγελιών',
    title_en: 'Live order tracking',
    desc_el: 'Οι πελάτες βλέπουν real-time την κατάσταση της παραγγελίας τους.',
    desc_en: 'Customers see real-time status of their order.',
  },
]

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepFeatures({ data, onNext }: Props) {
  const [selected, setSelected] = useState<Partial<OnboardingInput['features']>>(
    data.features ?? {
      reservations_enabled:   false,
      takeaway_enabled:       false,
      delivery_enabled:       false,
      staff_approval_enabled: false,
      faqs_enabled:           true,
      live_tracking_enabled:  false,
      orders_enabled:         false,
    }
  )

  function toggle(key: FeatureKey) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const features = {
      orders_enabled:         !!(selected.takeaway_enabled || selected.delivery_enabled),
      reservations_enabled:   !!selected.reservations_enabled,
      takeaway_enabled:       !!selected.takeaway_enabled,
      delivery_enabled:       !!selected.delivery_enabled,
      staff_approval_enabled: !!selected.staff_approval_enabled,
      faqs_enabled:           selected.faqs_enabled !== false,
      live_tracking_enabled:  !!selected.live_tracking_enabled,
    }
    onNext({ features })
  }

  return (
    <form id="wizard-form" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground mb-4">
        Επιλέξτε τι θέλετε να χειρίζεται ο AI agent σας. Μπορείτε να αλλάξετε τις επιλογές αργότερα.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ key, icon: Icon, title_el, title_en, desc_el, recommended }) => {
          const active = !!selected[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                'relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              {/* Check indicator */}
              <div className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors',
                active ? 'border-primary bg-primary' : 'border-border'
              )}>
                {active && <Check className="size-3 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-foreground/80')}>
                    {title_el}
                  </span>
                  {recommended && (
                    <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Συνιστάται
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc_el}</p>
              </div>
            </button>
          )
        })}
      </div>

      {!Object.values(selected).some(Boolean) && (
        <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Επιλέξτε τουλάχιστον μια υπηρεσία για να συνεχίσετε.
        </p>
      )}
    </form>
  )
}
