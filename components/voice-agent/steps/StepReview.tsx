'use client'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, Clock, CalendarDays, ShoppingBag, Truck, ClipboardCheck, MessageCircleQuestion, MapPin, Bot } from 'lucide-react'
import { DAY_NAMES_EL } from '@/lib/utils'
import type { OnboardingInput } from '@/types/db'

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
  isSubmitting: boolean
}

export function StepReview({ data, onNext, isSubmitting }: Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({})
  }

  const features = data.features
  const agent    = data.agent

  return (
    <form id="wizard-form" onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Ελέγξτε τα στοιχεία πριν δημιουργήσετε τον AI agent σας.
      </p>

      {/* Business basics */}
      <Section title="Επιχείρηση">
        <Row label="Όνομα" value={data.name} />
        <Row label="Τύπος" value={data.type} />
        {data.city && <Row label="Πόλη" value={data.city} />}
        {data.phone && <Row label="Τηλέφωνο" value={data.phone} />}
        {data.email && <Row label="Email" value={data.email} />}
      </Section>

      {/* Hours */}
      {data.operating_hours?.length && (
        <Section title="Ώρες λειτουργίας" icon={Clock}>
          <div className="grid gap-1">
            {[...data.operating_hours]
              .sort((a, b) => {
                const o = [1, 2, 3, 4, 5, 6, 0]
                return o.indexOf(a.day_of_week) - o.indexOf(b.day_of_week)
              })
              .map((h) => (
                <div key={h.day_of_week} className="flex items-center justify-between text-sm py-0.5">
                  <span className="text-muted-foreground w-28">{DAY_NAMES_EL[h.day_of_week]}</span>
                  <span className={h.is_open ? 'font-medium' : 'text-muted-foreground'}>
                    {h.is_open && h.open_time && h.close_time
                      ? `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}`
                      : 'Κλειστά'}
                  </span>
                </div>
              ))
            }
          </div>
        </Section>
      )}

      {/* Features */}
      {features && (
        <Section title="Ενεργές υπηρεσίες">
          <div className="flex flex-wrap gap-2">
            {features.reservations_enabled && <FeatureBadge icon={CalendarDays} label="Κρατήσεις" />}
            {features.takeaway_enabled      && <FeatureBadge icon={ShoppingBag}  label="Takeaway" />}
            {features.delivery_enabled      && <FeatureBadge icon={Truck}        label="Delivery" />}
            {features.staff_approval_enabled && <FeatureBadge icon={ClipboardCheck} label="Έγκριση" />}
            {features.faqs_enabled           && <FeatureBadge icon={MessageCircleQuestion} label="FAQs" />}
            {features.live_tracking_enabled  && <FeatureBadge icon={MapPin}      label="Live tracking" />}
          </div>
        </Section>
      )}

      {/* Menu */}
      {data.menu_items && data.menu_items.length > 0 && (
        <Section title="Μενού" icon={ShoppingBag}>
          <p className="text-sm text-muted-foreground">{data.menu_items.length} είδη προς προσθήκη</p>
        </Section>
      )}

      {/* FAQs */}
      {data.faqs && data.faqs.length > 0 && (
        <Section title="FAQs" icon={MessageCircleQuestion}>
          <p className="text-sm text-muted-foreground">{data.faqs.length} ερωτήσεις</p>
        </Section>
      )}

      {/* Agent */}
      {agent && (
        <Section title="AI Agent" icon={Bot}>
          <Row label="Όνομα" value={agent.agent_name} />
          <Row label="Γλώσσα" value={
            agent.language === 'bilingual' ? 'Bilingual (ΕΛ / EN)'
            : agent.language === 'greek' ? 'Ελληνικά'
            : 'English'
          } />
          <Row label="Ύφος" value={
            agent.tone === 'professional' ? 'Επαγγελματικό'
            : agent.tone === 'friendly' ? 'Φιλικό'
            : 'Χαλαρό'
          } />
          {agent.escalation_enabled && agent.escalation_phone && (
            <Row label="Escalation" value={agent.escalation_phone} />
          )}
        </Section>
      )}

      <Separator />

      <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
        <p className="text-sm font-medium text-primary flex items-center gap-2">
          <Check className="size-4" />
          Τι θα γίνει μόλις υποβάλετε
        </p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>• Δημιουργία χώρου επιχείρησης</li>
          <li>• Αυτόματη ρύθμιση ElevenLabs AI agent</li>
          <li>• Έτοιμος πίνακας ελέγχου με τις επιλεγμένες λειτουργίες</li>
        </ul>
      </div>
    </form>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="rounded-xl border border-border px-4 py-3 space-y-1.5">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function FeatureBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
      <Icon className="size-3" />
      {label}
    </Badge>
  )
}
