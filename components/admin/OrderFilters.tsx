'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Search } from 'lucide-react'
import type { OrderStatus, OrderType, OrderSource } from '@/lib/admin/types'

const STATUSES: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'awaiting_approval',
  'accepted',
  'preparing',
  'ready',
  'dispatched',
  'completed',
  'rejected',
  'cancelled',
]
const TYPES: (OrderType | 'all')[] = ['all', 'takeaway', 'delivery', 'dine_in']
const SOURCES: (OrderSource | 'all')[] = ['all', 'phone', 'portal', 'staff', 'webhook']

export function OrderFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  const set = (k: string, v: string) => {
    start(() => {
      const next = new URLSearchParams(params)
      if (!v || v === 'all') next.delete(k)
      else next.set(k, v)
      router.push(`?${next.toString()}`)
    })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
      <div
        style={{
          flex: '1 1 240px',
          maxWidth: 360,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--paper)',
          border: '1px solid var(--mist)',
          borderRadius: 6,
          padding: '0 10px',
          height: 36,
        }}
      >
        <Search size={14} color="var(--ash)" aria-hidden="true" />
        <input
          type="search"
          placeholder="Name, phone or reference"
          aria-label="Search orders"
          defaultValue={params.get('q') ?? ''}
          onChange={(e) => set('q', e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit' }}
        />
      </div>

      <input
        type="date"
        className="input"
        aria-label="From date"
        defaultValue={params.get('from') ?? ''}
        onChange={(e) => set('from', e.target.value)}
        style={{ width: 150 }}
      />
      <input
        type="date"
        className="input"
        aria-label="To date"
        defaultValue={params.get('to') ?? ''}
        onChange={(e) => set('to', e.target.value)}
        style={{ width: 150 }}
      />

      <select
        className="select"
        aria-label="Status filter"
        defaultValue={params.get('status') ?? 'all'}
        onChange={(e) => set('status', e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
          </option>
        ))}
      </select>

      <select
        className="select"
        aria-label="Type filter"
        defaultValue={params.get('type') ?? 'all'}
        onChange={(e) => set('type', e.target.value)}
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t === 'all' ? 'All types' : t.replace('_', ' ')}
          </option>
        ))}
      </select>

      <select
        className="select"
        aria-label="Source filter"
        defaultValue={params.get('source') ?? 'all'}
        onChange={(e) => set('source', e.target.value)}
      >
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'All sources' : s}
          </option>
        ))}
      </select>

      {pending && <span style={{ fontSize: 12, color: 'var(--ash)' }} aria-live="polite">Loading…</span>}
    </div>
  )
}
