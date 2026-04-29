export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <div className="skeleton" style={{ width: 180, height: 32 }} />
        <div className="skeleton" style={{ width: 120, height: 14 }} />
      </header>

      <section className="stats-grid" aria-label="Loading metrics">
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton" style={{ width: 120, height: 11 }} />
            <div className="skeleton" style={{ width: 80, height: 36 }} />
            <div className="skeleton" style={{ width: 100, height: 12 }} />
          </article>
        ))}
      </section>

      <section className="two-col">
        {[0, 1].map((i) => (
          <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--mist)' }}>
              <div className="skeleton" style={{ width: 160, height: 14 }} />
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: '100%', height: 36 }} />
              <div className="skeleton" style={{ width: '100%', height: 36 }} />
              <div className="skeleton" style={{ width: '100%', height: 36 }} />
            </div>
          </div>
        ))}
      </section>

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
