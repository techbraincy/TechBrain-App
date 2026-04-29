import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Σύνδεση' }

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F9F7F4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
      }}
    >
      {/* Top accent line */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: '#1C1C1A',
        }}
      />

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Wordmark */}
        <div style={{ marginBottom: 40 }}>
          <span
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8A8A85',
            }}
          >
            TechBrain
          </span>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 36 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, "Fraunces", serif)',
              fontSize: 'clamp(26px, 5vw, 32px)',
              fontWeight: 600,
              lineHeight: 1.25,
              color: '#111110',
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}
          >
            Your restaurant.<br />
            One control panel.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 14,
              color: '#8A8A85',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Συνδέσου για να δεις κρατήσεις, παραγγελίες και στατιστικά.
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #D8D5D0',
            borderRadius: 12,
            padding: '28px 28px 24px',
          }}
        >
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
