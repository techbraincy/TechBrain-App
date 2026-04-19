'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { OnboardingInput } from '@/types/db'

type FaqItem = NonNullable<OnboardingInput['faqs']>[number]

const faqSchema = z.object({
  question_el: z.string().min(5, 'Απαιτείται ερώτηση'),
  question_en: z.string().optional(),
  answer_el:   z.string().min(5, 'Απαιτείται απάντηση'),
  answer_en:   z.string().optional(),
})
type FaqForm = z.infer<typeof faqSchema>

const SUGGESTIONS: FaqItem[] = [
  {
    question_el: 'Πού βρίσκεστε;',
    question_en: 'Where are you located?',
    answer_el: '',
    answer_en: '',
  },
  {
    question_el: 'Κάνετε χώρο για μεγάλες ομάδες;',
    question_en: 'Do you accommodate large groups?',
    answer_el: '',
    answer_en: '',
  },
  {
    question_el: 'Υπάρχει χώρος στάθμευσης;',
    question_en: 'Is there parking available?',
    answer_el: '',
    answer_en: '',
  },
]

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepFaqs({ data, onNext }: Props) {
  const [faqs, setFaqs] = useState<FaqItem[]>(data.faqs ?? [])
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FaqForm>({
    resolver: zodResolver(faqSchema),
  })

  function addFaq(values: FaqForm) {
    setFaqs((prev) => [...prev, values])
    reset()
    setAdding(false)
  }

  function removeFaq(idx: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== idx))
  }

  function addSuggestion(s: FaqItem) {
    if (faqs.some((f) => f.question_el === s.question_el)) return
    setFaqs((prev) => [...prev, s])
  }

  function submitWizard(e: React.FormEvent) {
    e.preventDefault()
    onNext({ faqs })
  }

  return (
    <form id="wizard-form" onSubmit={submitWizard} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Προσθέστε συχνές ερωτήσεις που θα χρησιμοποιεί ο agent για να απαντά στους καλούντες.
      </p>

      {/* Suggestions */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Γρήγορη προσθήκη:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.question_el}
              type="button"
              onClick={() => addSuggestion(s)}
              disabled={faqs.some((f) => f.question_el === s.question_el)}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              + {s.question_el}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ list */}
      {faqs.length > 0 && (
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-xl border border-border overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
              >
                <p className="flex-1 text-sm font-medium truncate">{faq.question_el}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFaq(idx) }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
                {expanded === idx
                  ? <ChevronUp className="size-4 text-muted-foreground" />
                  : <ChevronDown className="size-4 text-muted-foreground" />
                }
              </div>
              {expanded === idx && faq.answer_el && (
                <div className="px-4 pb-3 pt-0 text-sm text-muted-foreground border-t border-border">
                  {faq.answer_el}
                </div>
              )}
              {expanded === idx && !faq.answer_el && (
                <div className="px-4 pb-3 pt-0 text-xs text-amber-600 border-t border-border">
                  Η απάντηση δεν έχει συμπληρωθεί ακόμα.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add FAQ form */}
      {adding ? (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ερώτηση (Ελληνικά) *</Label>
              <Input placeholder="π.χ. Έχετε χορτοφαγικά πιάτα;" {...register('question_el')} />
              {errors.question_el && <p className="text-xs text-destructive">{errors.question_el.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Question (English)</Label>
              <Input placeholder="e.g. Do you have vegetarian options?" {...register('question_en')} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Απάντηση (Ελληνικά) *</Label>
              <Textarea rows={2} placeholder="Η απάντηση που θα δώσει ο agent…" {...register('answer_el')} />
              {errors.answer_el && <p className="text-xs text-destructive">{errors.answer_el.message}</p>}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Answer (English)</Label>
              <Textarea rows={2} placeholder="The answer the agent will give…" {...register('answer_en')} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSubmit(addFaq)}>
              <Plus className="size-4" /> Προσθήκη
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); reset() }}>
              Ακύρωση
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="size-4" /> Προσθήκη ερώτησης
        </button>
      )}
    </form>
  )
}
