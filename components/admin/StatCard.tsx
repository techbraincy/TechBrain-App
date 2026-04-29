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
      className="card card-pad"
      aria-label={label}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ash)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span className="stat-number" style={{ fontSize: 44, lineHeight: 1.05 }}>
        {value}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        {deltaText && (
          <span style={{ fontSize: 12, color: deltaColor, fontVariantNumeric: 'tabular-nums' }}>
            {deltaText}
          </span>
        )}
        {hint && (
          <span style={{ fontSize: 12, color: 'var(--charcoal)' }}>{hint}</span>
        )}
      </div>
    </article>
  )
}
