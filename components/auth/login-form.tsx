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

// Inputs sit directly on the warm background — no white fill, no card
const inputBase: React.CSSProperties = {
  width: '100%',
  height: 46,
  padding: '0 14px',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 14,
  color: '#111110',
  background: 'transparent',
  border: '1px solid #B8B4AE',
  borderRadius: 4,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.12s',
  letterSpacing: '0.01em',
}

const inputFocused: React.CSSProperties = {
  borderColor: '#111110',
  background: 'rgba(255,255,255,0.45)',
}

const labelBase: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.11em',
  textTransform: 'uppercase' as const,
  color: '#ABA7A1',
  marginBottom: 6,
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
      {/* Email */}
      <div style={{ marginBottom: 18 }}>
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
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030', letterSpacing: '0.01em' }}>
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div style={{ marginBottom: 28 }}>
        <label htmlFor="password" style={labelBase}>Κωδικός</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ ...inputBase, paddingRight: 44, ...(pwFocus ? inputFocused : {}) }}
            onFocus={() => setPwFocus(true)}
            {...register('password', { onBlur: () => setPwFocus(false) })}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#B0ACA6',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.12s',
            }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030', letterSpacing: '0.01em' }}>
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Server error — inline, no card */}
      {serverError && (
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 13,
            color: '#B04030',
            fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
            lineHeight: 1.5,
          }}
        >
          {serverError}
        </p>
      )}

      {/* Submit — full black, no radius softness */}
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
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          border: 'none',
          borderRadius: 4,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.6 : 1,
          transition: 'opacity 0.15s, background 0.15s',
          marginBottom: 30,
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

      {/* Register — far below the button, very quiet */}
      <p
        style={{
          fontSize: 12,
          color: '#B0ACA6',
          margin: 0,
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
          letterSpacing: '0.01em',
        }}
      >
        Δεν έχεις λογαριασμό;{' '}
        <Link
          href="/register"
          style={{
            color: '#6A6A65',
            fontWeight: 500,
            textDecoration: 'none',
            borderBottom: '1px solid #C8C5BF',
            paddingBottom: 1,
          }}
        >
          Εγγραφή
        </Link>
      </p>
    </form>
  )
}
