'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { OnboardingInput } from '@/types/db'

type MenuItem = NonNullable<OnboardingInput['menu_items']>[number]

const itemSchema = z.object({
  name_el:          z.string().min(1, 'Απαιτείται'),
  name_en:          z.string().optional(),
  description_el:   z.string().optional(),
  price:            z.coerce.number().min(0, 'Μη έγκυρη τιμή'),
  category_name_el: z.string().optional(),
})
type ItemForm = z.infer<typeof itemSchema>

interface Props {
  data: Partial<OnboardingInput>
  onNext: (data: Partial<OnboardingInput>) => void
}

export function StepMenu({ data, onNext }: Props) {
  const [items, setItems] = useState<MenuItem[]>(data.menu_items ?? [])
  const [adding, setAdding] = useState(items.length === 0)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { price: 0 },
  })

  function addItem(values: ItemForm) {
    setItems((prev) => [...prev, { ...values, price: Number(values.price) }])
    reset({ price: 0 })
    setAdding(false)
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function submitWizard(e: React.FormEvent) {
    e.preventDefault()
    onNext({ menu_items: items })
  }

  return (
    <form id="wizard-form" onSubmit={submitWizard} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Προσθέστε τα είδη του μενού σας με τιμές. Ο agent θα τα χρησιμοποιεί κατά τις παραγγελίες.
        Μπορείτε να τα συμπληρώσετε και αργότερα από τον πίνακα ελέγχου.
      </p>

      {/* Item list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <GripVertical className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name_el}{item.name_en ? ` / ${item.name_en}` : ''}</p>
                {item.category_name_el && (
                  <p className="text-xs text-muted-foreground">{item.category_name_el}</p>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">€{Number(item.price).toFixed(2)}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add item form */}
      {adding ? (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Όνομα (Ελληνικά) *</Label>
              <Input placeholder="π.χ. Μαργαρίτα" {...register('name_el')} />
              {errors.name_el && <p className="text-xs text-destructive">{errors.name_el.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Name (English)</Label>
              <Input placeholder="e.g. Margherita" {...register('name_en')} />
            </div>

            <div className="space-y-1.5">
              <Label>Κατηγορία</Label>
              <Input placeholder="π.χ. Πίτσες" {...register('category_name_el')} />
            </div>

            <div className="space-y-1.5">
              <Label>Τιμή (€) *</Label>
              <Input type="number" min={0} step={0.5} placeholder="0.00" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSubmit(addItem)}>
              <Plus className="size-4" /> Προσθήκη
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
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
          <Plus className="size-4" /> Προσθήκη είδους
        </button>
      )}

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Δεν έχετε προσθέσει είδη ακόμα. Μπορείτε να συνεχίσετε χωρίς είδη και να τα προσθέσετε αργότερα.
        </p>
      )}
    </form>
  )
}
