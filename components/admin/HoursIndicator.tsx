'use client'

import { useEffect, useState } from 'react'

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
        fontSize: 11,
        color: 'var(--charcoal)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.04em',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: 'var(--success-ink)',
          display: 'inline-block',
        }}
      />
      <span>{now || '—'}</span>
    </div>
  )
}
