'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { X, CheckCircle2, CalendarClock, XCircle, Check } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { ReferenceTag } from './ReferenceTag'
import { StatusPill } from './StatusPill'
import { SourceIcon } from './SourceIcon'
import {
  formatDateTimeFull,
  formatPhone,
  RESERVATION_STATUS_LABEL,
  reservationStatusTone,
} from '@/lib/admin/formatters'
import type { Reservation } from '@/lib/admin/types'
import {
  confirmReservation,
  cancelReservation,
  rescheduleReservation,
  markReservationCompleted,
  setReservationNote,
} from '@/lib/admin/actions'

interface Props {
  reservation: Reservation | null
  onClose: () => void
}

export function ReservationDetailDrawer({ reservation, onClose }: Props) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState('')
  const [noteDirty, setNoteDirty] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (reservation) {
      setNote(reservation.notes ?? '')
      setNoteDirty(false)
      setShowReschedule(false)
      setError(null)
      const d = new Date(reservation.reserved_at)
      setNewDate(d.toISOString().slice(0, 10))
      setNewTime(d.toTimeString().slice(0, 5))
    }
  }, [reservation])

  const tryClose = () => {
    if (noteDirty) {
      const ok = window.confirm('You have unsaved note changes. Discard?')
      if (!ok) return
    }
    onClose()
  }

  const run = (fn: () => Promise<void>, after?: () => void) => {
    setError(null)
    start(async () => {
      try {
        await fn()
        after?.()
        onClose()
      } catch (e: any) {
        setError(e?.message ?? 'Action failed')
      }
    })
  }

  if (!reservation) return null

  return (
    <Dialog.Root open={!!reservation} onOpenChange={(o) => !o && tryClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content
          className="drawer-content"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (noteDirty) {
              e.preventDefault()
              tryClose()
            }
          }}
          onPointerDownOutside={(e) => {
            if (noteDirty) e.preventDefault()
          }}
        >
          <header
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--mist)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Dialog.Title className="heading-display" style={{ fontSize: 20, margin: 0 }}>
                Reservation
              </Dialog.Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ReferenceTag reference={reservation.reference} />
                <StatusPill
                  label={RESERVATION_STATUS_LABEL[reservation.status]}
                  tone={reservationStatusTone(reservation.status)}
                />
                <SourceIcon source={reservation.source} />
              </div>
            </div>
            <button
              ref={closeBtn}
              className="btn"
              data-variant="ghost"
              onClick={tryClose}
              aria-label="Close drawer"
              style={{ padding: 6 }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <DetailRow label="Reserved for" value={formatDateTimeFull(reservation.reserved_at)} />
            <DetailRow label="Party size" value={`${reservation.party_size}`} />
            <DetailRow
              label="Duration"
              value={`${reservation.duration_minutes} min`}
            />
            <DetailRow label="Customer" value={reservation.customer_name ?? '—'} />
            <DetailRow label="Phone" value={formatPhone(reservation.customer_phone) || '—'} />
            <DetailRow label="Language" value={(reservation.customer_language ?? '—').toUpperCase()} />
            {reservation.table_number && (
              <DetailRow label="Table" value={reservation.table_number} />
            )}
            {reservation.confirmed_at && (
              <DetailRow label="Confirmed at" value={formatDateTimeFull(reservation.confirmed_at)} />
            )}
            {reservation.rejection_reason && (
              <DetailRow label="Rejection reason" value={reservation.rejection_reason} />
            )}

            <div style={{ marginTop: 16 }}>
              <label
                htmlFor="note-textarea"
                style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}
              >
                Note
              </label>
              <textarea
                id="note-textarea"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  setNoteDirty(e.target.value !== (reservation.notes ?? ''))
                }}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid var(--mist)',
                  borderRadius: 6,
                  padding: 10,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  resize: 'vertical',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                }}
              />
              {noteDirty && (
                <button
                  className="btn"
                  data-variant="outline"
                  style={{ marginTop: 8 }}
                  disabled={pending}
                  onClick={() =>
                    run(() => setReservationNote(reservation.id, note), () => setNoteDirty(false))
                  }
                >
                  Save note
                </button>
              )}
            </div>

            {showReschedule && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: 'var(--cream)',
                  border: '1px solid var(--mist)',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                  Reschedule reservation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--ash)' }}>
                    Date
                    <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--ash)' }}>
                    Time
                    <input type="time" className="input" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn"
                    data-variant="primary"
                    disabled={pending || !newDate || !newTime}
                    onClick={() =>
                      run(() => rescheduleReservation(reservation.id, newDate, newTime))
                    }
                  >
                    Confirm new time
                  </button>
                  <button className="btn" data-variant="ghost" onClick={() => setShowReschedule(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 6,
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-ink)',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          <footer
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--mist)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {reservation.status === 'pending' && (
              <button
                className="btn"
                data-variant="primary"
                disabled={pending}
                onClick={() => run(() => confirmReservation(reservation.id))}
              >
                <Check size={14} aria-hidden="true" />
                Confirm
              </button>
            )}
            {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
              <button
                className="btn"
                data-variant="outline"
                disabled={pending}
                onClick={() => setShowReschedule(true)}
              >
                <CalendarClock size={14} aria-hidden="true" />
                Reschedule
              </button>
            )}
            {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
              <button
                className="btn"
                data-variant="outline"
                disabled={pending}
                onClick={() => run(() => markReservationCompleted(reservation.id))}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                Mark completed
              </button>
            )}
            {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
              <button
                className="btn"
                data-variant="danger"
                disabled={pending}
                onClick={() => {
                  const reason = window.prompt('Reason for cancellation? (optional)') ?? undefined
                  run(() => cancelReservation(reservation.id, reason || undefined))
                }}
                style={{ marginLeft: 'auto' }}
              >
                <XCircle size={14} aria-hidden="true" />
                Cancel
              </button>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        padding: '8px 0',
        borderBottom: '1px solid var(--mist)',
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--ash)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
