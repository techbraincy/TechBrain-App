'use client'

import { useState, useTransition } from 'react'
import { ReferenceTag } from './ReferenceTag'
import { StatusPill } from './StatusPill'
import { SourceIcon } from './SourceIcon'
import { ReservationDetailDrawer } from './ReservationDetailDrawer'
import { EmptyTable } from './EmptyTable'
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog'
import { archiveReservations } from '@/lib/admin/actions'
import {
  formatTimeShort,
  formatPhone,
  RESERVATION_STATUS_LABEL,
  reservationStatusTone,
} from '@/lib/admin/formatters'
import type { Reservation } from '@/lib/admin/types'

interface Props {
  rows: Reservation[]
  variant?: 'today' | 'full'
  selectable?: boolean
}

export function ReservationsTable({ rows, variant = 'full', selectable = true }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (rows.length === 0) {
    return (
      <EmptyTable
        title="Awaiting reservations"
        hint="Voice agent is active. Incoming bookings will appear here in real time."
      />
    )
  }

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.id)))
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  function handleArchiveConfirm() {
    startTransition(async () => {
      await archiveReservations(Array.from(selected))
      setSelected(new Set())
      setConfirmOpen(false)
    })
  }

  const open = rows.find((r) => r.id === openId) ?? null
  const now = new Date()

  return (
    <>
      <div className="table-scroll">
        <table className="admin-table" role="grid">
          <thead>
            <tr>
              {selectable && (
                <th scope="col" style={{ width: 36 }}>
                  <span className="sr-only">Select all</span>
                  <input
                    type="checkbox"
                    aria-label="Select all reservations"
                    checked={selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th scope="col" style={{ width: 64 }}>Time</th>
              <th scope="col" style={{ width: 96 }}>Ref</th>
              <th scope="col">Customer</th>
              <th scope="col" style={{ width: 130 }}>Phone</th>
              <th scope="col" style={{ width: 60, textAlign: 'right' }}>Pax</th>
              <th scope="col" style={{ width: 130 }}>Status</th>
              <th scope="col" style={{ width: 90 }}>Source</th>
              {variant === 'full' && <th scope="col">Notes</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const reservedAt = new Date(r.reserved_at)
              const past = reservedAt < now
              const cancelled = r.status === 'cancelled' || r.status === 'rejected' || r.status === 'no_show'
              return (
                <tr
                  key={r.id}
                  data-past={past ? 'true' : undefined}
                  data-cancelled={cancelled ? 'true' : undefined}
                  onClick={() => setOpenId(r.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenId(r.id)
                    }
                  }}
                  aria-label={`Reservation ${r.reference} for ${r.customer_name ?? 'unknown'} at ${formatTimeShort(r.reserved_at)}`}
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select reservation ${r.reference}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                  )}
                  <td style={{ fontWeight: 500 }}>{formatTimeShort(r.reserved_at)}</td>
                  <td>
                    <ReferenceTag reference={r.reference} />
                  </td>
                  <td>{r.customer_name ?? '—'}</td>
                  <td style={{ color: 'var(--charcoal)' }}>{formatPhone(r.customer_phone) || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{r.party_size}</td>
                  <td>
                    <StatusPill
                      label={RESERVATION_STATUS_LABEL[r.status]}
                      tone={reservationStatusTone(r.status)}
                    />
                  </td>
                  <td>
                    <SourceIcon source={r.source} />
                  </td>
                  {variant === 'full' && (
                    <td
                      style={{
                        color: 'var(--ash)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 240,
                      }}
                      title={r.notes ?? ''}
                    >
                      {r.notes ?? '—'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bulk-bar" role="region" aria-live="polite">
            <span>{selected.size} selected</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <button
              className="btn"
              data-variant="ghost"
              style={{ color: 'var(--paper)' }}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
            <button
              className="btn"
              data-variant="danger"
              onClick={() => setConfirmOpen(true)}
              disabled={isPending}
            >
              Archive selected
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ArchiveConfirmDialog
          count={selected.size}
          entity="reservation"
          onConfirm={handleArchiveConfirm}
          onCancel={() => setConfirmOpen(false)}
          loading={isPending}
        />
      )}

      <ReservationDetailDrawer
        reservation={open}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
