'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, CalendarRange, Receipt, Palette } from 'lucide-react'
import { LiveAgentPulse } from './LiveAgentPulse'
import type { BusinessWithMembership } from '@/types/db'

interface Props {
  business: BusinessWithMembership
}

export function Sidebar({ business }: Props) {
  const pathname = usePathname()
  const links = [
    { href: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
    { href: '/admin/reservations', label: 'Reservations', icon: CalendarRange, exact: false },
    { href: '/admin/orders', label: 'Orders', icon: Receipt, exact: false },
    { href: '/admin/branding', label: 'Branding', icon: Palette, exact: false },
  ]

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="sidebar" aria-label="Admin navigation">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 40,
          paddingBottom: 24,
          borderBottom: '1px solid var(--rule)',
        }}
      >
        {business.logo_url ? (
          <Image
            src={business.logo_url}
            alt={business.name}
            width={120}
            height={32}
            style={{ objectFit: 'contain', objectPosition: 'left center', maxHeight: 32 }}
            priority
          />
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {business.name}
          </span>
        )}
        <span
          style={{
            fontSize: 9,
            color: 'var(--ash)',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          Admin
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {links.map((l) => {
          const active = isActive(l.href, l.exact)
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className="sidebar-link"
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={14} strokeWidth={1.5} />
              <span>{l.label}</span>
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <LiveAgentPulse />
      </div>
    </aside>
  )
}
