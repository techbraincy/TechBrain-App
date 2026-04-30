'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-browser'

const schema = z.object({
  email: z.string().email('Μη έγκυρη διεύθυνση email'),
  token: z.string().regex(/^\d{6}$/, 'Ο κωδικός πρέπει να είναι 6 ψηφία'),
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
  borderBottom: '1px solid #A8A49E',
  borderRadius: 0,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.12s',
  letterSpacing: '0.01em',
}

const inputFocused: React.CSSProperties = {
  borderBottomColor: '#0D0D0C',
}

const labelBase: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#9A9590',
  marginBottom: 10,
}

type FieldName = 'email' | 'token'

export function VerifyForm() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const initialEmail  = searchParams.get('email') ?? ''

  const [serverError, setServerError]   = useState<string | null>(null)
  const [resendState, setResendState]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [resendError, setResendError]   = useState<string | null>(null)
  const [focus, setFocus]               = useState<FieldName | null>(null)

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail, token: '' },
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: 'signup',
    })
    if (error) {
      const msg = error.message.toLowerCase()
      setServerError(
        msg.includes('expired')
          ? 'Ο κωδικός έληξε. Ζήτησε νέο κωδικό παρακάτω.'
          : msg.includes('invalid')
            ? 'Λανθασμένος κωδικός. Έλεγξε το email σου και προσπάθησε ξανά.'
            : error.message
      )
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  async function onResend() {
    setResendError(null)
    const email = getValues('email')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResendState('error')
      setResendError('Συμπλήρωσε ένα έγκυρο email πρώτα.')
      return
    }
    setResendState('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      setResendState('error')
      setResendError(error.message)
      return
    }
    setResendState('sent')
  }

  const fieldStyle = (name: FieldName, extra?: React.CSSProperties): React.CSSProperties => ({
    ...inputBase,
    ...(focus === name ? inputFocused : {}),
    ...extra,
  })

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Email */}
      <div style={{ marginBottom: 22 }}>
        <label htmlFor="email" style={labelBase}>Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          style={fieldStyle('email')}
          onFocus={() => setFocus('email')}
          {...register('email', { onBlur: () => setFocus(null) })}
        />
        {errors.email && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Code */}
      <div style={{ marginBottom: 48 }}>
        <label htmlFor="token" style={labelBase}>Κωδικός επιβεβαίωσης</label>
        <input
          id="token"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="000000"
          style={fieldStyle('token', {
            fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
            fontSize: 22,
            letterSpacing: '0.5em',
            paddingLeft: 4,
          })}
          onFocus={() => setFocus('token')}
          {...register('token', { onBlur: () => setFocus(null) })}
        />
        {errors.token && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.token.message}
          </p>
        )}
      </div>

      {serverError && (
        <p style={{
          margin: '0 0 24px', fontSize: 13, color: '#B04030',
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)', lineHeight: 1.5,
        }}>
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          height: 52,
          width: 220,
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
          marginBottom: 24,
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#2A2A28'
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#111110'
        }}
      >
        {isSubmitting ? 'Επιβεβαίωση…' : 'Επιβεβαίωση'}
      </button>

      {/* Resend */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: 12, color: '#B0ACA6',
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
        }}>
          Δεν έλαβες τον κωδικό;
        </span>
        <button
          type="button"
          onClick={onResend}
          disabled={resendState === 'sending'}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: resendState === 'sending' ? 'not-allowed' : 'pointer',
            color: '#8A8680',
            fontWeight: 500,
            fontSize: 12,
            fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
            borderBottom: '1px solid #C4C0BA',
            paddingBottom: 1,
          }}
        >
          {resendState === 'sending' ? 'Αποστολή…'
            : resendState === 'sent' ? 'Στάλθηκε ✓'
            : 'Αποστολή νέου κωδικού'}
        </button>
      </div>

      {resendError && (
        <p style={{
          margin: '0 0 24px', fontSize: 12, color: '#B04030',
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
        }}>
          {resendError}
        </p>
      )}

      {/* Footer */}
      <p style={{
        fontSize: 12, color: '#C4C0BA', margin: 0,
        fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
      }}>
        Λάθος email;{' '}
        <Link
          href="/register"
          style={{
            color: '#8A8680', fontWeight: 500, textDecoration: 'none',
            borderBottom: '1px solid #C4C0BA', paddingBottom: 1,
          }}
        >
          Πίσω στην εγγραφή
        </Link>
      </p>
    </form>
  )
}
