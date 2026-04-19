'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { toast } from 'sonner'

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

export function RegisterForm() {
  const router = useRouter()
  const [showPw, setShowPw]     = useState(false)
  const [showCo, setShowCo]     = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
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
      toast.error(
        error.message.includes('already registered')
          ? 'Αυτό το email χρησιμοποιείται ήδη.'
          : error.message
      )
      return
    }

    toast.success('Λογαριασμός δημιουργήθηκε! Ελέγξτε το email σας.')
    router.push('/onboarding')
    router.refresh()
  }

  async function signUpWithGoogle() {
    setOauthLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Google */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-3"
        onClick={signUpWithGoogle}
        loading={oauthLoading}
      >
        <GoogleIcon />
        Εγγραφή με Google
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          ή με email
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full name */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Ονοματεπώνυμο</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="full_name"
              placeholder="Γιάννης Παπαδόπουλος"
              autoComplete="name"
              className="pl-9"
              {...register('full_name')}
            />
          </div>
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="pl-9"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Κωδικός</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              placeholder="Τουλάχιστον 8 χαρακτήρες"
              autoComplete="new-password"
              className="pl-9 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Επιβεβαίωση κωδικού</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="confirm"
              type={showCo ? 'text' : 'password'}
              placeholder="Επαναλάβετε τον κωδικό"
              autoComplete="new-password"
              className="pl-9 pr-10"
              {...register('confirm')}
            />
            <button
              type="button"
              onClick={() => setShowCo((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirm && (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Δημιουργία λογαριασμού
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Έχεις ήδη λογαριασμό;{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Σύνδεση
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
