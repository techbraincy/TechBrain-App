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
        paddingRight: 'clamp(32px, 3vw, 64px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ marginBottom: 64 }}>
          <span
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#B0ACA6',
            }}
          >
            TechBrain
          </span>
        </div>

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
