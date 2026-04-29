'use client'

interface Props {
  live?: boolean
}

export function LiveAgentPulse({ live = false }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={live ? 'Voice agent on call' : 'Voice agent idle'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 0 0',
        borderTop: '1px solid var(--rule)',
        background: 'transparent',
      }}
    >
      <span
        aria-hidden="true"
        className={live ? 'pulse-dot' : ''}
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: live ? 'var(--success-ink)' : 'var(--ash)',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: live ? 'var(--ink)' : 'var(--charcoal)',
          }}
        >
          {live ? 'Active call' : 'Voice agent idle'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ash)', letterSpacing: '0.04em' }}>
          {live ? 'Listening…' : 'Realtime feed pending'}
        </span>
      </div>
    </div>
  )
}
