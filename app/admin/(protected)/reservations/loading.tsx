export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <div className="skeleton" style={{ width: 220, height: 28 }} />
        <div className="skeleton" style={{ width: 80, height: 14 }} />
      </header>

      <div className="skeleton" style={{ width: '100%', height: 44 }} />

      <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: 40 }} />
        ))}
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, var(--mist) 0%, rgba(0,0,0,0.04) 50%, var(--mist) 100%);
          background-size: 200% 100%;
          border-radius: 4px;
          animation: skeleton-shine 1.4s ease-in-out infinite;
        }
        @keyframes skeleton-shine {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
