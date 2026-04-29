'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-browser'
import { Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Τουλάχιστον 2 χαρακτήρες'),
  email:     z.string().email('Μη έγκυρη διεύθυνση email'),
  password:  z.string().min(8, 'Τουλάχιστον 8 χαρακτήρες'),
  confirm:   z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Οι κωδικοί δεν ταιριάζουν',
  path: ['confirm'],
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

type FieldName = 'full_name' | 'email' | 'password' | 'confirm'

export function RegisterForm() {
  const router = useRouter()
  const [showPw, setShowPw]           = useState(false)
  const [showCo, setShowCo]           = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [focus, setFocus]             = useState<FieldName | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      setServerError(
        error.message.includes('already registered')
          ? 'Αυτό το email χρησιμοποιείται ήδη.'
          : error.message
      )
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  const fieldStyle = (name: FieldName, extra?: React.CSSProperties): React.CSSProperties => ({
    ...inputBase,
    ...(focus === name ? inputFocused : {}),
    ...extra,
  })

  const toggleStyle: React.CSSProperties = {
    position: 'absolute', right: 0, bottom: 10,
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', color: '#C4C0BA', display: 'flex', alignItems: 'center',
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Full name */}
      <div style={{ marginBottom: 22 }}>
        <label htmlFor="full_name" style={labelBase}>Ονοματεπώνυμο</label>
        <input
          id="full_name"
          placeholder="Γιάννης Παπαδόπουλος"
          autoComplete="name"
          style={fieldStyle('full_name')}
          onFocus={() => setFocus('full_name')}
          {...register('full_name', { onBlur: () => setFocus(null) })}
        />
        {errors.full_name && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.full_name.message}
          </p>
        )}
      </div>

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

      {/* Password */}
      <div style={{ marginBottom: 22 }}>
        <label htmlFor="password" style={labelBase}>Κωδικός</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            placeholder="Τουλάχιστον 8 χαρακτήρες"
            autoComplete="new-password"
            style={fieldStyle('password', { paddingRight: 32 })}
            onFocus={() => setFocus('password')}
            {...register('password', { onBlur: () => setFocus(null) })}
          />
          <button type="button" onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'} style={toggleStyle}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.password && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div style={{ marginBottom: 48 }}>
        <label htmlFor="confirm" style={labelBase}>Επιβεβαίωση κωδικού</label>
        <div style={{ position: 'relative' }}>
          <input
            id="confirm"
            type={showCo ? 'text' : 'password'}
            placeholder="Επαναλάβετε τον κωδικό"
            autoComplete="new-password"
            style={fieldStyle('confirm', { paddingRight: 32 })}
            onFocus={() => setFocus('confirm')}
            {...register('confirm', { onBlur: () => setFocus(null) })}
          />
          <button type="button" onClick={() => setShowCo((v) => !v)}
            aria-label={showCo ? 'Hide password' : 'Show password'} style={toggleStyle}>
            {showCo ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.confirm && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B04030' }}>
            {errors.confirm.message}
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
          marginBottom: 32,
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#2A2A28'
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#111110'
        }}
      >
        {isSubmitting ? 'Δημιουργία…' : 'Δημιουργία λογαριασμού'}
      </button>

      <p style={{
        fontSize: 12, color: '#C4C0BA', margin: 0,
        fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
      }}>
        Έχεις ήδη λογαριασμό;{' '}
        <Link
          href="/login"
          style={{
            color: '#8A8680', fontWeight: 500, textDecoration: 'none',
            borderBottom: '1px solid #C4C0BA', paddingBottom: 1,
          }}
        >
          Σύνδεση
        </Link>
      </p>
    </form>
  )
}
