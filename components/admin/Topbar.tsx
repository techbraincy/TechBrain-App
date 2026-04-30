'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { HoursIndicator } from './HoursIndicator'
import type { BusinessWithMembership } from '@/types/db'

interface Props {
  business: BusinessWithMembership
  userEmail: string
}

export function Topbar({ business: _business, userEmail }: Props) {
  const initials =
    userEmail
      .split('@')[0]
      .split(/[._-]/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'

  return (
    <header className="topbar" role="banner">
      <div
        style={{
          flex: '0 0 320px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--rule)',
          padding: '0 0 6px',
          height: 32,
        }}
      >
        <Search size={13} color="var(--ash)" aria-hidden="true" strokeWidth={1.5} />
        <input
          type="search"
          placeholder="Search reference, name or phone…"
          aria-label="Search"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--ink)',
            fontFamily: 'inherit',
            letterSpacing: '0.005em',
          }}
        />
        <kbd
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 10,
            color: 'var(--ash)',
            border: 'none',
            borderRadius: 0,
            padding: 0,
            background: 'transparent',
            letterSpacing: '0.04em',
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24 }}>
        <HoursIndicator />
        <Link
          href="/profile"
          aria-label={`Account ${userEmail} — open profile`}
          title="Profile"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'transparent',
            color: 'var(--ink)',
            border: '1px solid var(--mist)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textDecoration: 'none',
            transition: 'border-color 0.12s, background 0.12s',
          }}
        >
          {initials}
        </Link>
      </div>
    </header>
  )
}
