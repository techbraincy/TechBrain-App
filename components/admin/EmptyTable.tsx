interface Props {
  title: string
  hint?: string
}

export function EmptyTable({ title, hint }: Props) {
  return (
    <div
      role="status"
      style={{
        padding: '36px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--ash)',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ash)',
          }}
        >
          {title}
        </span>
      </div>
      {hint && (
        <div style={{ fontSize: 13, color: 'var(--charcoal)', letterSpacing: '0.005em' }}>
          {hint}
        </div>
      )}
    </div>
  )
}
