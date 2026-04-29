'use client'

import { useState, useTransition } from 'react'
import { ReferenceTag } from './ReferenceTag'
import { StatusPill } from './StatusPill'
import { SourceIcon } from './SourceIcon'
import { OrderDetailDrawer } from './OrderDetailDrawer'
import { EmptyTable } from './EmptyTable'
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog'
import { archiveOrders } from '@/lib/admin/actions'
import {
  formatTimeShort,
  formatPhone,
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  orderStatusTone,
  eur,
} from '@/lib/admin/formatters'
import type { Order } from '@/lib/admin/types'

interface Props {
  rows: Order[]
  variant?: 'today' | 'full'
  selectable?: boolean
}

export function OrdersTable({ rows, variant = 'full', selectable = true }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (rows.length === 0) {
    return (
      <EmptyTable
        title="Listening for orders"
        hint="Voice agent and storefront are active. New orders will stream in here."
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
      await archiveOrders(Array.from(selected))
      setSelected(new Set())
      setConfirmOpen(false)
    })
  }

  const open = rows.find((r) => r.id === openId) ?? null

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
                    aria-label="Select all orders"
                    checked={selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th scope="col" style={{ width: 64 }}>Time</th>
              <th scope="col" style={{ width: 96 }}>Ref</th>
              <th scope="col">Customer</th>
              <th scope="col" style={{ width: 130 }}>Phone</th>
              <th scope="col" style={{ width: 92 }}>Type</th>
              <th scope="col" style={{ width: 150 }}>Status</th>
              <th scope="col" style={{ width: 90 }}>Source</th>
              <th scope="col" style={{ width: 92, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const cancelled = o.status === 'cancelled' || o.status === 'rejected'
              return (
                <tr
                  key={o.id}
                  data-cancelled={cancelled ? 'true' : undefined}
                  onClick={() => setOpenId(o.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenId(o.id)
                    }
                  }}
                  aria-label={`Order ${o.reference} for ${o.customer_name ?? 'unknown'}`}
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select order ${o.reference}`}
                        checked={selected.has(o.id)}
                        onChange={() => toggleOne(o.id)}
                      />
                    </td>
                  )}
                  <td style={{ fontWeight: 500 }}>{formatTimeShort(o.created_at)}</td>
                  <td>
                    <ReferenceTag reference={o.reference} />
                  </td>
                  <td>{o.customer_name ?? '—'}</td>
                  <td style={{ color: 'var(--charcoal)' }}>{formatPhone(o.customer_phone) || '—'}</td>
                  <td>{ORDER_TYPE_LABEL[o.type]}</td>
                  <td>
                    <StatusPill label={ORDER_STATUS_LABEL[o.status]} tone={orderStatusTone(o.status)} />
                  </td>
                  <td>
                    <SourceIcon source={o.source} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{eur(Number(o.total ?? 0))}</td>
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
          entity="order"
          onConfirm={handleArchiveConfirm}
          onCancel={() => setConfirmOpen(false)}
          loading={isPending}
        />
      )}

      <OrderDetailDrawer order={open} onClose={() => setOpenId(null)} />
    </>
  )
}
