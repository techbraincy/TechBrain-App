'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import type { Faq } from '@/types/db'

const schema = z.object({
  question_el: z.string().min(3, 'Απαιτείται ερώτηση'),
  question_en: z.string().optional(),
  answer_el:   z.string().min(3, 'Απαιτείται απάντηση'),
  answer_en:   z.string().optional(),
  is_active:   z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

interface Props {
  businessId:  string
  initialFaqs: Faq[]
}

export function FaqsClient({ businessId, initialFaqs }: Props) {
  const [faqs, setFaqs]       = useState(initialFaqs)
  const [editing, setEditing] = useState<Faq | 'new' | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  })

  function openEdit(faq: Faq | 'new') {
    setEditing(faq)
    if (faq === 'new') {
      reset({ question_el: '', question_en: '', answer_el: '', answer_en: '', is_active: true })
    } else {
      reset({
        question_el: faq.question_el,
        question_en: faq.question_en ?? '',
        answer_el:   faq.answer_el,
        answer_en:   faq.answer_en ?? '',
        is_active:   faq.is_active,
      })
    }
  }

  async function saveFaq(values: FormData) {
    const isNew = editing === 'new'
    const url   = isNew
      ? `/api/businesses/${businessId}/faqs`
      : `/api/businesses/${businessId}/faqs/${(editing as Faq).id}`

    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, sort_order: isNew ? faqs.length : (editing as Faq).sort_order }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }

    if (isNew) {
      setFaqs((f) => [...f, json.faq])
    } else {
      setFaqs((f) => f.map((x) => x.id === json.faq.id ? json.faq : x))
    }
    toast.success(isNew ? 'Ερώτηση προστέθηκε' : 'Ερώτηση ενημερώθηκε')
    setEditing(null)
  }

  async function deleteFaq(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/businesses/${businessId}/faqs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFaqs((f) => f.filter((x) => x.id !== id))
      toast.success('Η ερώτηση διαγράφηκε')
    } else {
      toast.error('Αποτυχία διαγραφής')
    }
    setDeleting(null)
  }

  async function toggleActive(faq: Faq) {
    const res = await fetch(`/api/businesses/${businessId}/faqs/${faq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !faq.is_active }),
    })
    const json = await res.json()
    if (res.ok) setFaqs((f) => f.map((x) => x.id === faq.id ? json.faq : x))
  }

  return (
    <>
      <div className="space-y-2">
        {!faqs.length && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν ερωτήσεις ακόμα.</p>
            <p className="text-xs text-muted-foreground mt-1">Προσθέστε FAQs για να τα χρησιμοποιεί ο agent.</p>
          </div>
        )}

        {faqs.map((faq) => (
          <Card key={faq.id} className={faq.is_active ? '' : 'opacity-50'}>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 px-4 py-3">
                <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}>
                  <p className="text-sm font-medium truncate">{faq.question_el}</p>
                  {faq.question_en && <p className="text-xs text-muted-foreground truncate">{faq.question_en}</p>}
                </button>
                <Switch checked={faq.is_active} onCheckedChange={() => toggleActive(faq)} className="shrink-0" />
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => openEdit(faq)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteFaq(faq.id)} disabled={deleting === faq.id}>
                  <Trash2 className="size-3.5" />
                </Button>
                {expanded === faq.id ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
              </div>
              {expanded === faq.id && (
                <div className="px-4 pb-3 pt-0 border-t border-border space-y-1.5">
                  <p className="text-sm">{faq.answer_el}</p>
                  {faq.answer_en && <p className="text-sm text-muted-foreground">{faq.answer_en}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <button
          type="button"
          onClick={() => openEdit('new')}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="size-4" /> Νέα ερώτηση
        </button>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Νέα ερώτηση' : 'Επεξεργασία ερώτησης'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(saveFaq)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Ερώτηση (Ελληνικά) *</Label>
                <Input {...register('question_el')} placeholder="π.χ. Έχετε vegan επιλογές;" />
                {errors.question_el && <p className="text-xs text-destructive">{errors.question_el.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Question (English)</Label>
                <Input {...register('question_en')} placeholder="e.g. Do you have vegan options?" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Απάντηση (Ελληνικά) *</Label>
                <Textarea rows={2} {...register('answer_el')} placeholder="Η απάντηση…" />
                {errors.answer_el && <p className="text-xs text-destructive">{errors.answer_el.message}</p>}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Answer (English)</Label>
                <Textarea rows={2} {...register('answer_en')} placeholder="The answer…" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
              <Label>Ενεργή</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>Ακύρωση</Button>
              <Button type="submit" size="sm" loading={isSubmitting}>Αποθήκευση</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
