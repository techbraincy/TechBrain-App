'use client'

import { Search } from 'lucide-react'
import { HoursIndicator } from './HoursIndicator'
import type { BusinessWithMembership } from '@/types/db'

interface Props {
  business: BusinessWithMembership
  userEmail: string
}

export function Topbar({ business, userEmail }: Props) {
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
          gap: 8,
          background: 'var(--cream)',
          border: '1px solid var(--mist)',
          borderRadius: 6,
          padding: '0 10px',
          height: 32,
        }}
      >
        <Search size={14} color="var(--ash)" aria-hidden="true" />
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
          }}
        />
        <kbd
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 10,
            color: 'var(--ash)',
            border: '1px solid var(--mist)',
            borderRadius: 3,
            padding: '1px 4px',
            background: 'var(--paper)',
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <HoursIndicator />
        <div
          aria-label={`Account ${userEmail}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
