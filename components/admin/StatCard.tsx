import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  delta?: { value: number; suffix?: string; positiveIsGood?: boolean }
  hint?: ReactNode
}

export function StatCard({ label, value, delta, hint }: Props) {
  let deltaColor: string | undefined
  let deltaText: string | null = null
  if (delta && Number.isFinite(delta.value)) {
    const positiveIsGood = delta.positiveIsGood ?? true
    const isPositive = delta.value > 0
    const isNegative = delta.value < 0
    if (isPositive || isNegative) {
      deltaColor = (isPositive ? positiveIsGood : !positiveIsGood)
        ? 'var(--success-ink)'
        : 'var(--danger-ink)'
      const sign = isPositive ? '+' : ''
      deltaText = `${sign}${delta.value}${delta.suffix ?? ''}`
    } else {
      deltaText = `±0${delta.suffix ?? ''}`
      deltaColor = 'var(--ash)'
    }
  }

  return (
    <article
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '4px 32px 4px 0',
        borderRight: '1px solid var(--rule)',
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ash)',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span className="stat-number" style={{ fontSize: 56 }}>
        {value}
      </span>
      {(deltaText || hint) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -4 }}>
          {deltaText && (
            <span
              style={{
                fontSize: 11,
                color: deltaColor,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
              }}
            >
              {deltaText}
            </span>
          )}
          {hint && (
            <span style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.01em' }}>
              {hint}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
