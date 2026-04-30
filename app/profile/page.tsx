import type { Metadata } from 'next'
import Link from 'next/link'
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { requireSession } from '@/lib/auth/session'
import { LogoutButton } from '@/components/auth/LogoutButton'
import '@/app/admin/admin.css'

export const metadata: Metadata = { title: 'Profile' }

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
})
const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default async function ProfilePage() {
  const session = await requireSession()
  const { user, businesses } = session

  return (
    <div
      data-admin-root
      className={`${fraunces.variable} ${hanken.variable} ${mono.variable}`}
      style={{ minHeight: '100vh' }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: 'clamp(40px, 6vw, 72px) clamp(24px, 4vw, 48px) 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
        }}
      >
        {/* Header */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link
            href="/admin"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ash)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--mist)',
              paddingBottom: 1,
              alignSelf: 'flex-start',
            }}
          >
            ← Back to admin
          </Link>
          <h1
            className="heading-display"
            style={{
              fontSize: 'clamp(36px, 4.5vw, 48px)',
              margin: '20px 0 0',
              lineHeight: 1.05,
            }}
          >
            Profile
          </h1>
        </header>

        {/* Account */}
        <Section title="Account">
          <Row label="Email" value={user.email} mono />
          <Row label="Full name" value={user.full_name ?? '—'} />
          <Row
            label="Role"
            value={
              user.system_role === 'super_admin' ? 'Platform admin' : 'Member'
            }
          />
        </Section>

        {/* Memberships */}
        <Section
          title={businesses.length === 1 ? 'Business' : 'Businesses'}
        >
          {businesses.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ash)',
                margin: 0,
                letterSpacing: '0.005em',
              }}
            >
              No business membership.{' '}
              <Link
                href="/onboarding"
                style={{
                  color: 'var(--ink)',
                  borderBottom: '1px solid var(--mist)',
                  paddingBottom: 1,
                  textDecoration: 'none',
                }}
              >
                Complete onboarding
              </Link>
            </p>
          ) : (
            businesses.map((b) => (
              <Row
                key={b.id}
                label={b.name}
                value={
                  <span style={{ textTransform: 'capitalize' }}>{b.role}</span>
                }
              />
            ))
          )}
        </Section>

        {/* Sign out */}
        <Section title="Session">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 0',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: 'var(--charcoal)',
                letterSpacing: '0.005em',
              }}
            >
              End this session and return to the sign-in page.
            </span>
            <LogoutButton />
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span className="eyebrow">{title}</span>
      <div
        style={{
          borderTop: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 16,
        padding: '14px 0',
        borderBottom: '1px solid var(--rule)',
        alignItems: 'baseline',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ash)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          color: 'var(--ink)',
          letterSpacing: '0.005em',
          fontFamily: mono
            ? 'var(--font-mono, ui-monospace, monospace)'
            : 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  )
}
