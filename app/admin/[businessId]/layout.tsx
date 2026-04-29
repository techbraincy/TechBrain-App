import React from 'react'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { requireBusinessAccess } from '@/lib/auth/session'
import { AdminShell } from '@/components/admin/AdminShell'
import './admin.css'

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

export const metadata: Metadata = {
  title: 'Admin',
}

const NEUTRAL_ACCENT = '#4B5563'

interface Props {
  children: ReactNode
  params: { businessId: string }
}

export default async function AdminLayout({ children, params }: Props) {
  const { session, business } = await requireBusinessAccess(params.businessId)
  const accent = business.primary_color?.trim() || NEUTRAL_ACCENT

  return (
    <div
      data-admin-root
      className={`${fraunces.variable} ${hanken.variable} ${mono.variable}`}
      style={{ '--accent': accent, '--accent-soft': `color-mix(in srgb, ${accent} 12%, white)` } as React.CSSProperties}
    >
      <a href="#admin-main" className="skip-link">
        Skip to main content
      </a>
      <AdminShell business={business} userEmail={session.user.email}>
        {children}
      </AdminShell>
    </div>
  )
}
