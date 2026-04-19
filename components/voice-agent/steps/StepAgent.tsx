'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { OnboardingInput } from '@/types/db'

const schema = z.object({
  agent_name:           z.string().min(1, 'Απαιτείται').default('Assistant'),
  language:             z.enum(['greek', 'english', 'bilingual']).default('bilingual'),
  tone:                 z.enum(['professional', 'friendly', 'casual']).default('friendly'),
  greeting_greek:       z.string().optional(),
  greeting_english:     z.string().optional(),
  custom_instructions:  z.string().optional(),
  escalation_enabled:   z.boolean().default(false),
  escalation_phone:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

const LANGUAGES: Array<{ value: FormData['language']; label: string; desc: string }> = [
  { value: 'bilingual',  label: 'Bilingual 🇬🇷 🇬🇧', desc: 'Αυτόματη ανίχνευση γλώσσας' },
  { value: 'greek',      label: 'Ελληνικά',          desc: 'Μόνο Ελληνικά' },
  { value: 'english',    label: 'English',            desc: 'English only' },
]

const TONES: Array<{ value: FormData['tone']; label: string; desc: string }> = [
  { value: 'professional', label: 'Επαγγελματικό', desc: 'Επίσημο, ακριβές' },
  { value: 'friendly',     label: 'Φιλικό',        desc: 'Ζεστό, προσεγγίσιμο' },
  { value: 'casual',       label: 'Χαλαρό',        desc: 'Συνομιλητικό' },
]

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepAgent({ data, onNext }: Props) {
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      agent_name:           data.agent?.agent_name ?? 'Assistant',
      language:             data.agent?.language ?? 'bilingual',
      tone:                 data.agent?.tone ?? 'friendly',
      greeting_greek:       data.agent?.greeting_greek ?? '',
      greeting_english:     data.agent?.greeting_english ?? '',
      custom_instructions:  data.agent?.custom_instructions ?? '',
      escalation_enabled:   data.agent?.escalation_enabled ?? false,
      escalation_phone:     data.agent?.escalation_phone ?? '',
    },
  })

  const escalation = watch('escalation_enabled')
  const language   = watch('language')
  const tone       = watch('tone')

  function onSubmit(values: FormData) {
    onNext({ agent: values })
  }

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Agent name */}
      <div className="space-y-1.5">
        <Label htmlFor="agent_name">Όνομα agent</Label>
        <Input id="agent_name" placeholder="π.χ. Maria, Alex, Assistant" {...register('agent_name')} />
        <p className="text-xs text-muted-foreground">Το όνομα με το οποίο ο agent παρουσιάζεται στους καλούντες.</p>
        {errors.agent_name && <p className="text-xs text-destructive">{errors.agent_name.message}</p>}
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label>Γλώσσα</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setValue('language', l.value)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-all',
                language === l.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <span className="text-sm font-medium">{l.label}</span>
              <span className="text-xs text-muted-foreground">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <Label>Στυλ επικοινωνίας</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue('tone', t.value)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-all',
                tone === t.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Greetings */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(language === 'greek' || language === 'bilingual') && (
          <div className="space-y-1.5">
            <Label htmlFor="greeting_greek">Χαιρετισμός (Ελληνικά)</Label>
            <Input
              id="greeting_greek"
              placeholder={`Καλημέρα, μιλάτε με ${data.name ?? 'την επιχείρηση'}...`}
              {...register('greeting_greek')}
            />
          </div>
        )}
        {(language === 'english' || language === 'bilingual') && (
          <div className="space-y-1.5">
            <Label htmlFor="greeting_english">Greeting (English)</Label>
            <Input
              id="greeting_english"
              placeholder={`Hello, you've reached ${data.name ?? 'us'}...`}
              {...register('greeting_english')}
            />
          </div>
        )}
      </div>

      {/* Custom instructions */}
      <div className="space-y-1.5">
        <Label htmlFor="custom_instructions">Επιπλέον οδηγίες</Label>
        <Textarea
          id="custom_instructions"
          rows={3}
          placeholder="π.χ. Μην αποδέχεσαι παραγγελίες για περισσότερα από 10 άτομα. Πάντα να ρωτάς για αλλεργίες."
          {...register('custom_instructions')}
        />
        <p className="text-xs text-muted-foreground">Ειδικοί κανόνες που θα ακολουθεί πάντα ο agent.</p>
      </div>

      {/* Escalation */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Controller
            control={control}
            name="escalation_enabled"
            render={({ field }) => (
              <Switch id="escalation" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <div>
            <Label htmlFor="escalation" className="cursor-pointer">Σύνδεση με ανθρώπινο προσωπικό</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ο agent θα παρέχει τηλέφωνο προσωπικού αν ζητηθεί.
            </p>
          </div>
        </div>

        {escalation && (
          <div className="px-4 pb-4 border-t border-border">
            <div className="pt-3 space-y-1.5">
              <Label htmlFor="escalation_phone">Τηλέφωνο προσωπικού</Label>
              <Input id="escalation_phone" type="tel" placeholder="+30 69..." {...register('escalation_phone')} />
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
