'use client'

import { useForm, Controller } from 'react-hook-form'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { OnboardingInput } from '@/types/db'

const DAY_LABELS = [
  { dow: 1, el: 'Δευτέρα', en: 'Mon' },
  { dow: 2, el: 'Τρίτη',   en: 'Tue' },
  { dow: 3, el: 'Τετάρτη', en: 'Wed' },
  { dow: 4, el: 'Πέμπτη',  en: 'Thu' },
  { dow: 5, el: 'Παρασκευή', en: 'Fri' },
  { dow: 6, el: 'Σάββατο', en: 'Sat' },
  { dow: 0, el: 'Κυριακή', en: 'Sun' },
]

const DEFAULT_HOURS: OnboardingInput['operating_hours'] = DAY_LABELS.map(({ dow }) => ({
  day_of_week: dow,
  is_open:    dow >= 1 && dow <= 6,
  open_time:  dow === 6 ? '10:00' : '09:00',
  close_time: dow === 6 ? '22:00' : '21:00',
}))

interface FormData {
  operating_hours: OnboardingInput['operating_hours']
}

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepHours({ data, onNext }: Props) {
  const { control, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      operating_hours: data.operating_hours?.length
        ? [...data.operating_hours].sort((a, b) => {
            const order = [1, 2, 3, 4, 5, 6, 0]
            return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
          })
        : DEFAULT_HOURS,
    },
  })

  const hours = watch('operating_hours')

  function onSubmit(values: FormData) {
    onNext({ operating_hours: values.operating_hours })
  }

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      {DAY_LABELS.map(({ dow, el, en }, idx) => {
        const isOpen = hours[idx]?.is_open

        return (
          <div
            key={dow}
            className={cn(
              'flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors',
              isOpen ? 'border-border bg-background' : 'border-border/50 bg-muted/30'
            )}
          >
            {/* Day name */}
            <div className="w-28 shrink-0">
              <p className={cn('text-sm font-medium', !isOpen && 'text-muted-foreground')}>{el}</p>
              <p className="text-xs text-muted-foreground">{en}</p>
            </div>

            {/* Toggle */}
            <Controller
              control={control}
              name={`operating_hours.${idx}.is_open`}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            {/* Time inputs */}
            {isOpen ? (
              <div className="flex flex-1 items-center gap-2">
                <Controller
                  control={control}
                  name={`operating_hours.${idx}.open_time`}
                  render={({ field }) => (
                    <Input
                      type="time"
                      className="w-32"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Controller
                  control={control}
                  name={`operating_hours.${idx}.close_time`}
                  render={({ field }) => (
                    <Input
                      type="time"
                      className="w-32"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">Κλειστά</span>
            )}
          </div>
        )
      })}
    </form>
  )
}
