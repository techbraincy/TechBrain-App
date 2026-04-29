interface Props {
  title: string
  hint?: string
}

export function EmptyTable({ title, hint }: Props) {
  return (
    <div
      role="status"
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--charcoal)',
        background: 'var(--paper)',
        border: '1px dashed var(--mist)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
