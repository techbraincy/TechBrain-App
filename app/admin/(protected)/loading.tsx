export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{ display: 'flex', flexDirection: 'column', gap: 72 }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ width: 220, height: 11 }} />
        <div className="skeleton" style={{ width: 280, height: 44 }} />
      </header>

      <section
        className="stats-grid"
        aria-label="Loading metrics"
        style={{
          borderTop: '1px solid var(--mist)',
          borderBottom: '1px solid var(--mist)',
          padding: '32px 0',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <article
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: '4px 32px 4px 0',
              borderRight: '1px solid var(--rule)',
            }}
          >
            <div className="skeleton" style={{ width: 110, height: 10 }} />
            <div className="skeleton" style={{ width: 96, height: 56 }} />
            <div className="skeleton" style={{ width: 130, height: 11 }} />
          </article>
        ))}
      </section>

      <section className="two-col">
        {[0, 1].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ width: 60, height: 10 }} />
              <div className="skeleton" style={{ width: 180, height: 24 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ width: '100%', height: 28 }} />
              <div className="skeleton" style={{ width: '100%', height: 28 }} />
              <div className="skeleton" style={{ width: '100%', height: 28 }} />
              <div className="skeleton" style={{ width: '100%', height: 28 }} />
            </div>
          </div>
        ))}
      </section>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, var(--rule) 0%, rgba(0,0,0,0.025) 50%, var(--rule) 100%);
          background-size: 200% 100%;
          border-radius: 0;
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
