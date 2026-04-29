'use client'

interface Props {
  count: number
  entity: 'reservation' | 'order'
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

export function ArchiveConfirmDialog({ count, entity, onConfirm, onCancel, loading }: Props) {
  const label = entity === 'reservation'
    ? count === 1 ? '1 reservation' : `${count} reservations`
    : count === 1 ? '1 order' : `${count} orders`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-dialog-title"
      className="drawer-overlay"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--mist)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 8px 32px rgba(26,22,20,0.12)',
          position: 'relative',
          zIndex: 42,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="archive-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Archive {label}?
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.55 }}>
          {label.charAt(0).toUpperCase() + label.slice(1)} will be hidden from the active view.
          No data is deleted — archived records can be recovered from the database if needed.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            data-variant="danger"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Archiving…' : `Archive ${count}`}
          </button>
        </div>
      </div>
    </div>
  )
}
