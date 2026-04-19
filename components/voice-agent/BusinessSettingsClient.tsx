'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { User, Clock, Shield } from 'lucide-react'
import type { BusinessWithMembership, OperatingHours } from '@/types/db'

const DAY_LABELS = [
  { dow: 1, el: 'Δευτέρα' }, { dow: 2, el: 'Τρίτη' }, { dow: 3, el: 'Τετάρτη' },
  { dow: 4, el: 'Πέμπτη' }, { dow: 5, el: 'Παρασκευή' }, { dow: 6, el: 'Σάββατο' }, { dow: 0, el: 'Κυριακή' },
]

const bizSchema = z.object({
  name:        z.string().min(2),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().optional(),
  website:     z.string().url().optional().or(z.literal('')),
  address:     z.string().optional(),
  city:        z.string().optional(),
  postal_code: z.string().optional(),
  primary_color: z.string(),
  accent_color:  z.string(),
})
type BizForm = z.infer<typeof bizSchema>

interface Props {
  business:     BusinessWithMembership
  initialHours: OperatingHours[]
  members:      any[]
}

export function BusinessSettingsClient({ business, initialHours, members }: Props) {
  const [savingBiz, setSavingBiz]     = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [hours, setHours]             = useState(initialHours)

  const bizForm = useForm<BizForm>({
    resolver: zodResolver(bizSchema),
    defaultValues: {
      name:          business.name,
      email:         business.email ?? '',
      phone:         business.phone ?? '',
      website:       business.website ?? '',
      address:       business.address ?? '',
      city:          business.city ?? '',
      postal_code:   business.postal_code ?? '',
      primary_color: business.primary_color ?? '#6366f1',
      accent_color:  business.accent_color ?? '#06b6d4',
    },
  })

  async function saveBusiness(values: BizForm) {
    setSavingBiz(true)
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Στοιχεία αποθηκεύτηκαν')
    } catch (e: any) { toast.error(e.message) }
    finally { setSavingBiz(false) }
  }

  function updateHour(dow: number, field: 'is_open' | 'open_time' | 'close_time', value: boolean | string) {
    setHours((prev) => {
      const existing = prev.find((h) => h.day_of_week === dow)
      if (existing) return prev.map((h) => h.day_of_week === dow ? { ...h, [field]: value } : h)
      return [...prev, { id: '', business_id: business.id, day_of_week: dow, is_open: true, open_time: '09:00', close_time: '21:00', [field]: value }]
    })
  }

  async function saveHours() {
    setSavingHours(true)
    try {
      const res = await fetch(`/api/businesses/${business.id}/hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Ωράριο αποθηκεύτηκε')
    } catch (e: any) { toast.error(e.message) }
    finally { setSavingHours(false) }
  }

  const isOwner = business.role === 'owner'

  return (
    <Tabs defaultValue="business">
      <TabsList>
        <TabsTrigger value="business">Επιχείρηση</TabsTrigger>
        <TabsTrigger value="hours">Ωράριο</TabsTrigger>
        <TabsTrigger value="team">Ομάδα</TabsTrigger>
      </TabsList>

      {/* Business info */}
      <TabsContent value="business" className="mt-6">
        <form onSubmit={bizForm.handleSubmit(saveBusiness)} className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Βασικά στοιχεία</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Όνομα *</Label>
                  <Input {...bizForm.register('name')} />
                  {bizForm.formState.errors.name && <p className="text-xs text-destructive">{bizForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...bizForm.register('email')} /></div>
                <div className="space-y-1.5"><Label>Τηλέφωνο</Label><Input type="tel" {...bizForm.register('phone')} /></div>
                <div className="space-y-1.5"><Label>Website</Label><Input {...bizForm.register('website')} /></div>
                <div className="space-y-1.5"><Label>Διεύθυνση</Label><Input {...bizForm.register('address')} /></div>
                <div className="space-y-1.5"><Label>Πόλη</Label><Input {...bizForm.register('city')} /></div>
                <div className="space-y-1.5"><Label>ΤΚ</Label><Input {...bizForm.register('postal_code')} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Χρώματα branding</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {(['primary_color', 'accent_color'] as const).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{key === 'primary_color' ? 'Κύριο χρώμα' : 'Accent'}</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-9 w-14 cursor-pointer rounded-lg border border-input p-1"
                        {...bizForm.register(key)} />
                      <Input className="w-28 font-mono text-xs" {...bizForm.register(key)} maxLength={7} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={savingBiz}>Αποθήκευση</Button>
          </div>
        </form>
      </TabsContent>

      {/* Hours */}
      <TabsContent value="hours" className="mt-6 space-y-4">
        <div className="space-y-2">
          {DAY_LABELS.map(({ dow, el }) => {
            const h = hours.find((x) => x.day_of_week === dow)
            const isOpen = h?.is_open ?? false
            return (
              <div key={dow} className={cn(
                'flex items-center gap-4 rounded-xl border px-4 py-3',
                isOpen ? 'border-border' : 'border-border/50 bg-muted/30'
              )}>
                <p className={cn('w-24 text-sm font-medium shrink-0', !isOpen && 'text-muted-foreground')}>{el}</p>
                <Switch checked={isOpen} onCheckedChange={(v) => updateHour(dow, 'is_open', v)} />
                {isOpen ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input type="time" className="w-32" value={h?.open_time?.slice(0, 5) ?? '09:00'}
                      onChange={(e) => updateHour(dow, 'open_time', e.target.value)} />
                    <span className="text-muted-foreground">—</span>
                    <Input type="time" className="w-32" value={h?.close_time?.slice(0, 5) ?? '21:00'}
                      onChange={(e) => updateHour(dow, 'close_time', e.target.value)} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Κλειστά</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={saveHours} loading={savingHours}>Αποθήκευση ωραρίου</Button>
        </div>
      </TabsContent>

      {/* Team */}
      <TabsContent value="team" className="mt-6 space-y-4">
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {(m.profile?.full_name?.[0] ?? m.profile?.email?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.profile?.full_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                </div>
                <Badge variant={m.role === 'owner' ? 'default' : m.role === 'manager' ? 'secondary' : 'outline'}>
                  {m.role === 'owner' ? 'Ιδιοκτήτης' : m.role === 'manager' ? 'Manager' : 'Staff'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        {!isOwner && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="size-3.5" /> Μόνο ο ιδιοκτήτης μπορεί να διαχειριστεί την ομάδα.
          </p>
        )}
      </TabsContent>
    </Tabs>
  )
}
