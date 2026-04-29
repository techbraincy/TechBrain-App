'use client'

// Realtime "active call" hook isn't wired to call_logs yet. This component
// renders an idle state and is structured to accept a `live` prop once the
// realtime subscription is added.

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
        padding: '10px 12px',
        border: '1px solid var(--mist)',
        borderRadius: 8,
        background: 'var(--paper)',
      }}
    >
      <span
        aria-hidden="true"
        className={live ? 'pulse-dot' : ''}
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: live ? 'var(--success-ink)' : 'var(--ash)',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
          {live ? 'Active call' : 'Voice agent idle'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ash)', letterSpacing: '0.04em' }}>
          {live ? 'Listening…' : 'Realtime feed not yet wired'}
        </span>
      </div>
    </div>
  )
}
