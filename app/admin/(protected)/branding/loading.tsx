export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header>
        <div className="skeleton" style={{ width: 180, height: 28 }} />
      </header>

      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ width: '40%', height: 14 }} />
        <div className="skeleton" style={{ width: '100%', height: 36 }} />
        <div className="skeleton" style={{ width: '40%', height: 14 }} />
        <div className="skeleton" style={{ width: '100%', height: 36 }} />
        <div className="skeleton" style={{ width: 120, height: 36 }} />
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
