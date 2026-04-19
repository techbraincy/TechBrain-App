'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/utils'
import { Check, X, Users, Clock, Phone, FileText, CalendarDays } from 'lucide-react'
import type { Reservation, ReservationStatus } from '@/types/db'

type ResWithCustomer = Reservation & {
  customer: { name: string | null; phone: string | null } | null
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:   'Εκκρεμεί',
  confirmed: 'Επιβεβαιωμένη',
  rejected:  'Απορρίφθηκε',
  completed: 'Ολοκληρώθηκε',
  no_show:   'No show',
  cancelled: 'Ακυρώθηκε',
}
const STATUS_VARIANT: Record<ReservationStatus, 'warning' | 'success' | 'destructive' | 'secondary' | 'default'> = {
  pending:   'warning',
  confirmed: 'success',
  rejected:  'destructive',
  completed: 'default',
  no_show:   'secondary',
  cancelled: 'secondary',
}

interface Props {
  businessId:           string
  initialReservations:  ResWithCustomer[]
  autoConfirm:          boolean
}

export function ReservationsClient({ businessId, initialReservations, autoConfirm }: Props) {
  const [reservations, setReservations] = useState(initialReservations)
  const [selected, setSelected]         = useState<ResWithCustomer | null>(null)
  const [rejecting, setRejecting]       = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading]           = useState<string | null>(null)

  const updateStatus = useCallback(async (id: string, status: ReservationStatus, extra?: Record<string, unknown>) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/businesses/${businessId}/reservations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: id, status, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setReservations((prev) => prev.map((r) => r.id === id ? { ...r, ...json.reservation } : r))
      if (selected?.id === id) setSelected((s) => s ? { ...s, ...json.reservation } : s)
      toast.success(STATUS_LABELS[status])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }, [businessId, selected])

  const pending   = reservations.filter((r) => r.status === 'pending')
  const upcoming  = reservations.filter((r) => r.status === 'confirmed')
  const past      = reservations.filter((r) => ['completed', 'no_show', 'rejected', 'cancelled'].includes(r.status))

  return (
    <>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Εκκρεμείς {pending.length > 0 && <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 font-semibold">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Επιβεβαιωμένες ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Παρελθόν</TabsTrigger>
        </TabsList>

        {(['pending', 'upcoming', 'past'] as const).map((tab) => {
          const list = tab === 'pending' ? pending : tab === 'upcoming' ? upcoming : past
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              {!list.length ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
                  <CalendarDays className="size-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Καμία κράτηση</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {list.map((res) => (
                    <ResRow
                      key={res.id}
                      res={res}
                      loading={loading === res.id}
                      onSelect={() => setSelected(res)}
                      onConfirm={() => updateStatus(res.id, 'confirmed')}
                      onReject={() => { setSelected(res); setRejecting(true) }}
                      onComplete={() => updateStatus(res.id, 'completed')}
                      onNoShow={() => updateStatus(res.id, 'no_show')}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selected && !rejecting} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span>{selected.reference}</span>
                <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <InfoRow icon={CalendarDays} text={formatDateTime(selected.reserved_at)} />
              <InfoRow icon={Users} text={`${selected.party_size} άτομα`} />
              {selected.customer_name && <InfoRow icon={FileText} text={selected.customer_name} />}
              {selected.customer_phone && <InfoRow icon={Phone} text={selected.customer_phone} href={`tel:${selected.customer_phone}`} />}
              {selected.notes && <InfoRow icon={FileText} text={selected.notes} muted />}
            </div>
            <DialogFooter className="flex-row gap-2">
              {selected.status === 'pending' && (
                <>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => setRejecting(true)}>
                    <X className="size-4" /> Απόρριψη
                  </Button>
                  <Button size="sm" className="flex-1" loading={loading === selected.id}
                    onClick={() => updateStatus(selected.id, 'confirmed')}>
                    <Check className="size-4" /> Επιβεβαίωση
                  </Button>
                </>
              )}
              {selected.status === 'confirmed' && (
                <>
                  <Button variant="secondary" size="sm" className="flex-1" loading={loading === selected.id}
                    onClick={() => updateStatus(selected.id, 'no_show')}>
                    No show
                  </Button>
                  <Button size="sm" className="flex-1" loading={loading === selected.id}
                    onClick={() => updateStatus(selected.id, 'completed')}>
                    <Check className="size-4" /> Ολοκλήρωση
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejecting} onOpenChange={(o) => { if (!o) { setRejecting(false); setRejectReason('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Απόρριψη κράτησης</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selected?.reference} · {selected?.customer_name}</p>
            <div className="space-y-1.5">
              <Label>Αιτία (προαιρετικό)</Label>
              <Input placeholder="π.χ. Δεν υπάρχει διαθέσιμο τραπέζι" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Ακύρωση</Button>
            <Button variant="destructive" size="sm" loading={!!loading}
              onClick={() => selected && updateStatus(selected.id, 'rejected', { rejection_reason: rejectReason }).then(() => { setRejecting(false); setRejectReason('') })}>
              Απόρριψη
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ResRow({ res, loading, onSelect, onConfirm, onReject, onComplete, onNoShow }: {
  res: ResWithCustomer; loading: boolean
  onSelect: () => void; onConfirm: () => void; onReject: () => void
  onComplete: () => void; onNoShow: () => void
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0 text-center w-12">
            <p className="text-xs text-muted-foreground">{new Date(res.reserved_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })}</p>
            <p className="text-sm font-semibold">{new Date(res.reserved_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{res.customer_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="size-3" /> {res.party_size} άτομα
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[res.status]} className="shrink-0 text-xs">{STATUS_LABELS[res.status]}</Badge>
          <div className="flex gap-1 shrink-0">
            {res.status === 'pending' && (
              <>
                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:bg-destructive/10" onClick={onReject} disabled={loading}><X className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-7 text-emerald-600 hover:bg-emerald-50" onClick={onConfirm} disabled={loading}><Check className="size-4" /></Button>
              </>
            )}
            <Button size="icon" variant="ghost" className="size-7" onClick={onSelect}><FileText className="size-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ icon: Icon, text, href, muted }: { icon: React.ElementType; text: string; href?: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      {href
        ? <a href={href} className="hover:underline">{text}</a>
        : <span className={muted ? 'text-muted-foreground' : ''}>{text}</span>
      }
    </div>
  )
}
