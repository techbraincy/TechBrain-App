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
    <article className="stat-card" aria-label={label}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-number stat-card-value">{value}</span>
      {(deltaText || hint) && (
        <div className="stat-card-meta">
          {deltaText && (
            <span style={{ color: deltaColor }}>{deltaText}</span>
          )}
          {hint && <span style={{ color: 'var(--ash)' }}>{hint}</span>}
        </div>
      )}
    </article>
  )
}
