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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--mist)' }}>
        {business.logo_url ? (
          <Image
            src={business.logo_url}
            alt={business.name}
            width={120}
            height={36}
            style={{ objectFit: 'contain', objectPosition: 'left center', maxHeight: 36 }}
            priority
          />
        ) : (
          <span style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontFamily: 'var(--font-body, system-ui, sans-serif)',
            color: 'var(--ink)',
          }}>
            {business.name}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
          Admin
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
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
              <Icon size={16} strokeWidth={1.75} />
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
