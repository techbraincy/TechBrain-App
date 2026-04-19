'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, Truck } from 'lucide-react'
import type { OnboardingInput } from '@/types/db'

const reservationSchema = z.object({
  slot_duration_minutes: z.coerce.number().min(15).max(240).default(60),
  max_party_size:        z.coerce.number().min(1).max(50).default(10),
  min_advance_minutes:   z.coerce.number().min(0).default(60),
  max_advance_days:      z.coerce.number().min(1).max(365).default(30),
  buffer_minutes:        z.coerce.number().min(0).max(60).default(15),
  auto_confirm:          z.boolean().default(false),
})

const deliverySchema = z.object({
  delivery_radius_km:  z.coerce.number().min(0.5).max(100).default(5),
  min_order_amount:    z.coerce.number().min(0).default(0),
  delivery_fee:        z.coerce.number().min(0).default(2),
  free_delivery_above: z.coerce.number().min(0).optional(),
  estimated_minutes:   z.coerce.number().min(10).max(180).default(45),
})

type ReservationData = z.infer<typeof reservationSchema>
type DeliveryData = z.infer<typeof deliverySchema>

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepConfig({ data, onNext }: Props) {
  const showReservations = !!data.features?.reservations_enabled
  const showDelivery     = !!data.features?.delivery_enabled

  const resForm = useForm<ReservationData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: data.reservation_config ?? {
      slot_duration_minutes: 60,
      max_party_size: 10,
      min_advance_minutes: 60,
      max_advance_days: 30,
      buffer_minutes: 15,
      auto_confirm: false,
    },
  })

  const delForm = useForm<DeliveryData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: data.delivery_config
      ? {
          ...data.delivery_config,
          free_delivery_above: data.delivery_config.free_delivery_above ?? undefined,
        }
      : {
          delivery_radius_km: 5,
          min_order_amount: 0,
          delivery_fee: 2,
          free_delivery_above: undefined,
          estimated_minutes: 45,
        },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    let resData: ReservationData | undefined
    let delData: DeliveryData | undefined

    if (showReservations) {
      const valid = await resForm.trigger()
      if (!valid) return
      resData = resForm.getValues()
    }

    if (showDelivery) {
      const valid = await delForm.trigger()
      if (!valid) return
      delData = delForm.getValues()
    }

    onNext({
      reservation_config: resData,
      delivery_config: delData,
    })
  }

  const defaultTab = showReservations ? 'reservations' : 'delivery'

  return (
    <form id="wizard-form" onSubmit={handleSubmit}>
      <Tabs defaultValue={defaultTab}>
        {showReservations && showDelivery && (
          <TabsList className="mb-6">
            <TabsTrigger value="reservations" className="gap-2">
              <CalendarDays className="size-4" /> Κρατήσεις
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              <Truck className="size-4" /> Delivery
            </TabsTrigger>
          </TabsList>
        )}

        {showReservations && (
          <TabsContent value="reservations" className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Ορίστε τους κανόνες που θα ακολουθεί ο agent για κρατήσεις.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Διάρκεια slot (λεπτά)" error={resForm.formState.errors.slot_duration_minutes?.message}>
                <Input type="number" min={15} max={240} {...resForm.register('slot_duration_minutes')} />
              </Field>

              <Field label="Μέγιστο μέγεθος ομάδας (άτομα)" error={resForm.formState.errors.max_party_size?.message}>
                <Input type="number" min={1} max={50} {...resForm.register('max_party_size')} />
              </Field>

              <Field label="Ελάχιστη προπαραγγελία (λεπτά)" error={resForm.formState.errors.min_advance_minutes?.message}>
                <Input type="number" min={0} {...resForm.register('min_advance_minutes')} />
              </Field>

              <Field label="Μέγιστη προπαραγγελία (ημέρες)" error={resForm.formState.errors.max_advance_days?.message}>
                <Input type="number" min={1} max={365} {...resForm.register('max_advance_days')} />
              </Field>

              <Field label="Απόσταση μεταξύ slots (λεπτά)" error={resForm.formState.errors.buffer_minutes?.message}>
                <Input type="number" min={0} max={60} {...resForm.register('buffer_minutes')} />
              </Field>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <Switch
                id="auto_confirm"
                checked={resForm.watch('auto_confirm')}
                onCheckedChange={(v) => resForm.setValue('auto_confirm', v)}
              />
              <div>
                <Label htmlFor="auto_confirm" className="cursor-pointer">Αυτόματη επιβεβαίωση</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Οι κρατήσεις επιβεβαιώνονται αυτόματα χωρίς έγκριση προσωπικού.
                </p>
              </div>
            </div>
          </TabsContent>
        )}

        {showDelivery && (
          <TabsContent value="delivery" className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Ορίστε τους κανόνες delivery για τον agent.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ακτίνα delivery (km)" error={delForm.formState.errors.delivery_radius_km?.message}>
                <Input type="number" min={0.5} step={0.5} {...delForm.register('delivery_radius_km')} />
              </Field>

              <Field label="Ελάχιστη παραγγελία (€)" error={delForm.formState.errors.min_order_amount?.message}>
                <Input type="number" min={0} step={0.5} {...delForm.register('min_order_amount')} />
              </Field>

              <Field label="Χρέωση delivery (€)" error={delForm.formState.errors.delivery_fee?.message}>
                <Input type="number" min={0} step={0.5} {...delForm.register('delivery_fee')} />
              </Field>

              <Field label="Δωρεάν delivery άνω των (€)" error={delForm.formState.errors.free_delivery_above?.message}>
                <Input type="number" min={0} step={0.5} placeholder="Αφήστε κενό αν δεν ισχύει" {...delForm.register('free_delivery_above')} />
              </Field>

              <Field label="Εκτιμώμενος χρόνος delivery (λεπτά)" error={delForm.formState.errors.estimated_minutes?.message}>
                <Input type="number" min={10} max={180} {...delForm.register('estimated_minutes')} />
              </Field>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
