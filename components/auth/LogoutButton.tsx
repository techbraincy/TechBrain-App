'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-browser'

interface Props {
  style?: React.CSSProperties
  className?: string
}

export function LogoutButton({ style, className }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onClick() {
    if (pending) return
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={className}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: pending ? 'not-allowed' : 'pointer',
        color: '#8A8680',
        fontFamily: 'var(--font-body, "Hanken Grotesk", system-ui, sans-serif)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        borderBottom: '1px solid #C4C0BA',
        paddingBottom: 1,
        opacity: pending ? 0.5 : 1,
        ...style,
      }}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
