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

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 48,
  padding: '0 14px',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 14,
  color: '#111110',
  background: '#FAFAF9',
  border: '1px solid #D8D5D0',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
  fontSize: 13,
  fontWeight: 500,
  color: '#3A3A38',
  marginBottom: 6,
}

export function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard'
  const [showPw, setShowPw]         = useState(false)
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

  const focusStyle: React.CSSProperties = {
    borderColor: '#3A3A38',
    boxShadow: '0 0 0 3px rgba(58,58,56,0.10)',
    background: '#FFFFFF',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Email */}
      <div>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          style={{ ...inputStyle, ...(emailFocus ? focusStyle : {}) }}
          onFocus={() => setEmailFocus(true)}
          {...register('email', { onBlur: () => setEmailFocus(false) })}
        />
        {errors.email && (
          <p style={{ margin: '5px 0 0', fontSize: 12, color: '#C0392B' }}>
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" style={labelStyle}>Κωδικός</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ ...inputStyle, paddingRight: 44, ...(pwFocus ? focusStyle : {}) }}
            onFocus={() => setPwFocus(true)}
            {...register('password', { onBlur: () => setPwFocus(false) })}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#8A8A85',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p style={{ margin: '5px 0 0', fontSize: 12, color: '#C0392B' }}>
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div
          style={{
            padding: '10px 14px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            fontSize: 13,
            color: '#991B1B',
            fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
          }}
        >
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          height: 50,
          width: '100%',
          background: isSubmitting ? '#3A3A38' : '#1C1C1A',
          color: '#F9F7F4',
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.02em',
          border: 'none',
          borderRadius: 8,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, transform 0.1s',
          marginTop: 2,
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#333331'
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = '#1C1C1A'
        }}
      >
        {isSubmitting ? 'Σύνδεση…' : 'Σύνδεση'}
      </button>

      {/* Register link */}
      <p
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#8A8A85',
          margin: 0,
          fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
        }}
      >
        Δεν έχεις λογαριασμό;{' '}
        <Link
          href="/register"
          style={{ color: '#3A3A38', fontWeight: 600, textDecoration: 'none' }}
        >
          Εγγραφή
        </Link>
      </p>
    </form>
  )
}
