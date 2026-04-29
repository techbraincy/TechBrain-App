'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-browser'
import { Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  email:    z.string().email('Μη έγκυρη διεύθυνση email'),
  password: z.string().min(6, 'Τουλάχιστον 6 χαρακτήρες'),
})
type FormData = z.infer<typeof schema>

const inputBase: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 0 10px',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 15,
  color: '#111110',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid #C4C0BA',
  borderRadius: 0,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.12s',
  letterSpacing: '0.01em',
}

const inputFocused: React.CSSProperties = {
  borderBottomColor: '#111110',
}

const labelBase: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#B8B4AE',
  marginBottom: 10,
}

export function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard'
  const [showPw, setShowPw]           = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailFocus, setEmailFocus]   = useState(false)
  const [pwFocus, setPwFocus]         = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError(
        error.message.includes('Invalid login credentials')
          ? 'Λανθασμένο email ή κωδικός.'
          : error.message
      )
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      <div style={{ marginBottom: 28 }}>
        <label htmlFor="email" style={labelBase}>Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          style={{ ...inputBase, ...(emailFocus ? inputFocused : {}) }}
          onFocus={() => setEmailFocus(true)}
          {...register('email', { onBlur: () => setEmailFocus(false) })}
        />
        {errors.email && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 44 }}>
        <label htmlFor="password" style={labelBase}>Κωδικός</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ ...inputBase, paddingRight: 32, ...(pwFocus ? inputFocused : {}) }}
            onFocus={() => setPwFocus(true)}
            {...register('password', { onBlur: () => setPwFocus(false) })}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 10,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#C4C0BA',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.password && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 13,
            color: '#B04030',
            fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
            lineHeight: 1.5,
          }}
        >
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          height: 52,
          width: '100%',
          background: '#111110',
          color: '#F3F1ED',
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: 'none',
          borderRadius: 3,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.55 : 1,
          transition: 'opacity 0.15s, background 0.15s',
          marginBottom: 32,
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#2A2A28'
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#111110'
        }}
      >
        {isSubmitting ? 'Σύνδεση…' : 'Σύνδεση'}
      </button>

      <p
        style={{
          fontSize: 12,
          color: '#C4C0BA',
          margin: 0,
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
        }}
      >
        Δεν έχεις λογαριασμό;{' '}
        <Link
          href="/register"
          style={{
            color: '#8A8680',
            fontWeight: 500,
            textDecoration: 'none',
            borderBottom: '1px solid #C4C0BA',
            paddingBottom: 1,
          }}
        >
          Εγγραφή
        </Link>
      </p>
    </form>
  )
}
