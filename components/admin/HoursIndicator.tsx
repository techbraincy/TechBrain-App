'use client'

import { useEffect, useState } from 'react'

// Live clock. Operating-hours wiring is a TODO once the operating_hours feed
// is exposed to the client. Falls back to clock-only presentation.
export function HoursIndicator() {
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    const tick = () =>
      setNow(
        new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
      )
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: 'var(--charcoal)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: 'var(--success-ink)',
          display: 'inline-block',
        }}
      />
      <span>{now || '—'}</span>
    </div>
  )
}
