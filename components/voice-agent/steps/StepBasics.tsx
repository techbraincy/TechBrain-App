'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OnboardingInput } from '@/types/db'

const schema = z.object({
  name:        z.string().min(2, 'Απαιτείται όνομα επιχείρησης'),
  type:        z.enum(['restaurant', 'cafe', 'bar', 'bakery', 'retail', 'services', 'beauty', 'healthcare', 'other']),
  description: z.string().optional(),
  email:       z.string().email('Μη έγκυρο email').optional().or(z.literal('')),
  phone:       z.string().optional(),
  website:     z.string().url('Μη έγκυρο URL').optional().or(z.literal('')),
  address:     z.string().optional(),
  city:        z.string().optional(),
  postal_code: z.string().optional(),
  country:     z.string().default('Greece'),
  timezone:    z.string().default('Europe/Athens'),
  locale:      z.string().default('el'),
  primary_color: z.string().default('#6366f1'),
  accent_color:  z.string().default('#06b6d4'),
})

type FormData = z.infer<typeof schema>

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Εστιατόριο / Restaurant' },
  { value: 'cafe',       label: 'Καφέ / Café' },
  { value: 'bar',        label: 'Μπαρ / Bar' },
  { value: 'bakery',     label: 'Αρτοποιείο / Bakery' },
  { value: 'retail',     label: 'Λιανικό / Retail' },
  { value: 'services',   label: 'Υπηρεσίες / Services' },
  { value: 'beauty',     label: 'Ομορφιά / Beauty' },
  { value: 'healthcare', label: 'Υγεία / Healthcare' },
  { value: 'other',      label: 'Άλλο / Other' },
]

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepBasics({ data, onNext }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          data.name ?? '',
      type:          data.type ?? 'restaurant',
      description:   data.description ?? '',
      email:         data.email ?? '',
      phone:         data.phone ?? '',
      website:       data.website ?? '',
      address:       data.address ?? '',
      city:          data.city ?? '',
      postal_code:   data.postal_code ?? '',
      country:       data.country ?? 'Greece',
      timezone:      data.timezone ?? 'Europe/Athens',
      locale:        data.locale ?? 'el',
      primary_color: data.primary_color ?? '#6366f1',
      accent_color:  data.accent_color ?? '#06b6d4',
    },
  })

  function onSubmit(values: FormData) {
    onNext(values)
  }

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Business name */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Όνομα επιχείρησης *</Label>
          <Input id="name" placeholder="π.χ. Taverna Παπαδόπουλος" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label>Τύπος επιχείρησης *</Label>
          <Select
            defaultValue={data.type ?? 'restaurant'}
            onValueChange={(v) => setValue('type', v as FormData['type'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε τύπο" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Locale */}
        <div className="space-y-1.5">
          <Label>Κύρια γλώσσα</Label>
          <Select
            defaultValue={data.locale ?? 'el'}
            onValueChange={(v) => setValue('locale', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="el">Ελληνικά</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="description">Σύντομη περιγραφή</Label>
          <Textarea
            id="description"
            placeholder="Μια πρόταση για το τι προσφέρετε…"
            rows={2}
            {...register('description')}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email επιχείρησης</Label>
          <Input id="email" type="email" placeholder="info@business.gr" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Τηλέφωνο</Label>
          <Input id="phone" type="tel" placeholder="+30 21 0000 0000" {...register('phone')} />
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input id="website" placeholder="https://www.business.gr" {...register('website')} />
          {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="address">Διεύθυνση</Label>
          <Input id="address" placeholder="Ερμού 12" {...register('address')} />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city">Πόλη</Label>
          <Input id="city" placeholder="Αθήνα" {...register('city')} />
        </div>

        {/* Postal code */}
        <div className="space-y-1.5">
          <Label htmlFor="postal_code">ΤΚ</Label>
          <Input id="postal_code" placeholder="10560" {...register('postal_code')} />
        </div>

        {/* Colors */}
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-muted-foreground mb-3">Χρώματα branding</p>
          <div className="flex gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="primary_color">Κύριο χρώμα</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary_color"
                  type="color"
                  className="h-9 w-14 cursor-pointer rounded-lg border border-input p-1"
                  {...register('primary_color')}
                />
                <Input
                  className="w-28 font-mono text-xs"
                  {...register('primary_color')}
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accent_color">Accent χρώμα</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accent_color"
                  type="color"
                  className="h-9 w-14 cursor-pointer rounded-lg border border-input p-1"
                  {...register('accent_color')}
                />
                <Input
                  className="w-28 font-mono text-xs"
                  {...register('accent_color')}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
