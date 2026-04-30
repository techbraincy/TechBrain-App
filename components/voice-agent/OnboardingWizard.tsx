'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StepBasics }    from './steps/StepBasics'
import { StepHours }     from './steps/StepHours'
import { StepFeatures }  from './steps/StepFeatures'
import { StepConfig }    from './steps/StepConfig'
import { StepMenu }      from './steps/StepMenu'
import { StepFaqs }      from './steps/StepFaqs'
import { StepAgent }     from './steps/StepAgent'
import { StepReview }    from './steps/StepReview'
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'
import type { OnboardingInput } from '@/types/db'

// ----------------------------------------------------------------
// Step definitions
// ----------------------------------------------------------------
type StepId = 'basics' | 'hours' | 'features' | 'config' | 'menu' | 'faqs' | 'agent' | 'review'

interface WizardStep {
  id: StepId
  label: string
  label_short: string
  /** Returns true if this step should be shown given the current data */
  visible: (data: Partial<OnboardingInput>) => boolean
}

const ALL_STEPS: WizardStep[] = [
  {
    id: 'basics',
    label: 'Στοιχεία επιχείρησης',
    label_short: 'Στοιχεία',
    visible: () => true,
  },
  {
    id: 'hours',
    label: 'Ώρες λειτουργίας',
    label_short: 'Ώρες',
    visible: () => true,
  },
  {
    id: 'features',
    label: 'Υπηρεσίες',
    label_short: 'Υπηρεσίες',
    visible: () => true,
  },
  {
    id: 'config',
    label: 'Ρυθμίσεις',
    label_short: 'Ρυθμίσεις',
    visible: (d) => !!(d.features?.reservations_enabled || d.features?.delivery_enabled),
  },
  {
    id: 'menu',
    label: 'Μενού & τιμές',
    label_short: 'Μενού',
    visible: (d) => !!(d.features?.takeaway_enabled || d.features?.delivery_enabled || d.features?.orders_enabled),
  },
  {
    id: 'faqs',
    label: 'Συχνές ερωτήσεις',
    label_short: 'FAQs',
    visible: (d) => !!d.features?.faqs_enabled,
  },
  {
    id: 'agent',
    label: 'AI Agent',
    label_short: 'Agent',
    visible: () => true,
  },
  {
    id: 'review',
    label: 'Επισκόπηση',
    label_short: 'Έλεγχος',
    visible: () => true,
  },
]

// ----------------------------------------------------------------
// Wizard
// ----------------------------------------------------------------
export function OnboardingWizard() {
  const router = useRouter()
  const [data, setData]               = useState<Partial<OnboardingInput>>({})
  const [currentStepId, setCurrentStepId] = useState<StepId>('basics')
  const [submitting, setSubmitting]   = useState(false)

  // Active steps based on current feature selection
  const steps = ALL_STEPS.filter((s) => s.visible(data))
  const currentIdx = steps.findIndex((s) => s.id === currentStepId)
  const isFirst = currentIdx === 0
  const isLast  = currentIdx === steps.length - 1

  function mergeAndAdvance(partial: Partial<OnboardingInput>) {
    const merged = { ...data, ...partial }
    setData(merged)

    if (isLast) {
      submitOnboarding(merged)
      return
    }

    // Recompute visible steps after merging (features may have changed)
    const nextSteps = ALL_STEPS.filter((s) => s.visible(merged))
    const nextStep  = nextSteps[currentIdx + 1]
    if (nextStep) setCurrentStepId(nextStep.id)
  }

  function goBack() {
    if (isFirst) return
    setCurrentStepId(steps[currentIdx - 1].id)
  }

  async function submitOnboarding(finalData: Partial<OnboardingInput>) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      })

      const json = await res.json()

      // eslint-disable-next-line no-console
      console.log('[onboarding-submit] response', {
        ok: res.ok,
        status: res.status,
        businessId: json?.businessId ?? null,
        agentId: json?.agentId ?? null,
        setupStatus: json?.setupStatus ?? null,
        error: json?.error ?? null,
      })

      if (!res.ok) {
        throw new Error(json.error ?? 'Σφάλμα κατά τη δημιουργία της επιχείρησης')
      }

      if (json.setupStatus === 'failed') {
        toast.success('Η επιχείρησή σας δημιουργήθηκε. Ο AI agent θα ρυθμιστεί στο επόμενο βήμα.')
      } else {
        toast.success('Η επιχείρησή σας δημιουργήθηκε! Ανακατεύθυνση…')
      }

      // Land on /admin — requireAdminSession resolves the new business via
      // session.businesses (admin client, RLS-bypassed). Hard navigation so
      // the auth cookie is fully visible to the next server request.
      window.location.assign('/admin')
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[onboarding-submit] failed', err)
      toast.error(err.message ?? 'Κάτι πήγε στραβά')
      setSubmitting(false)
    }
  }

  const stepProgress = Math.round(((currentIdx + 1) / steps.length) * 100)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-muted/30 px-4 py-8">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-white">V</span>
          </div>
          <span className="text-sm font-semibold">VoiceAgent</span>
        </div>

        <nav className="space-y-1">
          {steps.map((step, idx) => {
            const done    = idx < currentIdx
            const current = idx === currentIdx
            return (
              <button
                key={step.id}
                type="button"
                disabled={idx > currentIdx}
                onClick={() => idx < currentIdx && setCurrentStepId(step.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  current ? 'bg-primary/10 text-primary font-medium'
                  : done   ? 'text-foreground hover:bg-muted cursor-pointer'
                  : 'text-muted-foreground cursor-default'
                )}
              >
                <div className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  current ? 'border-primary bg-primary text-white'
                  : done   ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-border text-muted-foreground'
                )}>
                  {done ? <Check className="size-3" /> : idx + 1}
                </div>
                {step.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile progress bar */}
        <div className="lg:hidden h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${stepProgress}%` }}
          />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Βήμα {currentIdx + 1} από {steps.length}
            </p>
            <h1 className="text-lg font-semibold">{steps[currentIdx]?.label}</h1>
          </div>
          <div className="lg:hidden text-xs text-muted-foreground">{stepProgress}%</div>
        </header>

        {/* Step content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl w-full mx-auto">
          <StepRenderer
            stepId={currentStepId}
            data={data}
            onNext={mergeAndAdvance}
            isSubmitting={submitting}
          />
        </main>

        {/* Navigation */}
        <footer className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={isFirst || submitting}
              className="gap-1.5"
            >
              <ChevronLeft className="size-4" /> Πίσω
            </Button>

            <Button
              type="submit"
              form="wizard-form"
              size="default"
              disabled={submitting}
              className="gap-1.5 min-w-28"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Δημιουργία…
                </>
              ) : isLast ? (
                <>
                  <Check className="size-4" />
                  Δημιουργία επιχείρησης
                </>
              ) : (
                <>
                  Επόμενο
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Step renderer — dispatches to the right step component
// ----------------------------------------------------------------
function StepRenderer({
  stepId, data, onNext, isSubmitting,
}: {
  stepId: StepId
  data: Partial<OnboardingInput>
  onNext: (partial: Partial<OnboardingInput>) => void
  isSubmitting: boolean
}) {
  switch (stepId) {
    case 'basics':   return <StepBasics   data={data} onNext={onNext} />
    case 'hours':    return <StepHours    data={data} onNext={onNext} />
    case 'features': return <StepFeatures data={data} onNext={onNext} />
    case 'config':   return <StepConfig   data={data} onNext={onNext} />
    case 'menu':     return <StepMenu     data={data} onNext={onNext} />
    case 'faqs':     return <StepFaqs     data={data} onNext={onNext} />
    case 'agent':    return <StepAgent    data={data} onNext={onNext} />
    case 'review':   return <StepReview   data={data} onNext={onNext} isSubmitting={isSubmitting} />
    default:         return null
  }
}
