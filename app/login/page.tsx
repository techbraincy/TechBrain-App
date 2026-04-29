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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Pulls layout to ~38% from top — slightly above center, not mathematical midpoint
        justifyContent: 'flex-start',
        paddingTop: 'clamp(72px, 14vh, 140px)',
        paddingBottom: '80px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Wordmark — small, tracked, anchors the space */}
        <div style={{ marginBottom: 56 }}>
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

        {/* Headline — dominant, large, tight */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, "Fraunces", serif)',
              fontSize: 'clamp(36px, 6vw, 44px)',
              fontWeight: 500,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: '#111110',
              margin: 0,
            }}
          >
            Your restaurant.<br />
            One control panel.
          </h1>
        </div>

        {/* Subtext — quiet, subordinate to the headline */}
        <div style={{ marginBottom: 52 }}>
          <p
            style={{
              fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
              fontSize: 13,
              color: '#9A9590',
              margin: 0,
              lineHeight: 1.65,
              letterSpacing: '0.01em',
            }}
          >
            Κρατήσεις, παραγγελίες και στατιστικά — σε ένα μέρος.
          </p>
        </div>

        {/* Form — sits directly on the page, no container */}
        <Suspense>
          <LoginForm />
        </Suspense>

      </div>
    </div>
  )
}
