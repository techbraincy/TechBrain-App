import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Σύνδεση' }

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F3F1ED',
        display: 'grid',
        gridTemplateColumns: '1fr',
        alignItems: 'start',
        paddingTop: 'clamp(60px, 11vh, 116px)',
        paddingBottom: '80px',
        paddingLeft: 'clamp(32px, 10vw, 192px)',
        paddingRight: 'clamp(32px, 31vw, 460px)',
        position: 'relative',
      }}
    >
      {/* Right-side structural panel — hidden on small screens */}
      <style>{`
        @media (max-width: 768px) { .login-right-panel { display: none !important; } }
      `}</style>
      <div
        className="login-right-panel"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '27vw',
          height: '100vh',
          background: 'linear-gradient(to left, #0D0D0C 0%, #111110 60%, #141413 100%)',
          borderLeft: '1px solid #2A2A28',
          pointerEvents: 'none',
        }}
      >
        {/* Horizontal rules — divide panel into thirds */}
        {['33.33%', '66.66%'].map((top) => (
          <div
            key={top}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: '1px',
              background: '#222220',
            }}
          />
        ))}

        {/* Rotated vertical text — centered, architectural */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#2E2E2C',
          }}
        >
          Restaurant Operations Platform
        </div>

        {/* Status line — bottom of panel */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#3A3A36',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#2E2E2C',
            }}
          >
            System online
          </span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Wordmark */}
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#9A9590',
            }}
          >
            TechBrain
          </span>
        </div>

        {/* Separator — wordmark / headline */}
        <div
          style={{
            height: '1px',
            background: '#D8D5CE',
            marginBottom: 32,
            width: '100%',
          }}
        />

        {/* Headline */}
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, "Fraunces", serif)',
              fontSize: 'clamp(38px, 6.5vw, 48px)',
              fontWeight: 700,
              lineHeight: 1.03,
              letterSpacing: '-0.03em',
              color: '#0D0D0C',
              margin: 0,
            }}
          >
            Your restaurant.<br />
            One control panel.
          </h1>
        </div>

        {/* Subtext */}
        <div style={{ marginBottom: 52 }}>
          <p
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 13,
              color: '#B0ACA6',
              margin: 0,
              lineHeight: 1.6,
              letterSpacing: '0.005em',
            }}
          >
            Κρατήσεις, παραγγελίες και στατιστικά — σε ένα μέρος.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

      </div>
    </div>
  )
}
