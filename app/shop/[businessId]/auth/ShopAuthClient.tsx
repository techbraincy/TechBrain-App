'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Props {
  businessId:   string
  businessName: string
  primaryColor: string
}

export function ShopAuthClient({ businessId, businessName, primaryColor }: Props) {
  const router = useRouter()
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Ensure profile exists
        await fetch(`/api/shop/${businessId}/profile`, { method: 'GET' })
        router.push(`/shop/${businessId}`)
        router.refresh()
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

        // Create app_customer profile
        const res = await fetch(`/api/shop/${businessId}/profile`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ first_name: firstName, last_name: lastName }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Σφάλμα δημιουργίας λογαριασμού')
        }
        toast.success('Ο λογαριασμός σας δημιουργήθηκε!')
        router.push(`/shop/${businessId}`)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Σφάλμα')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mini header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/shop/${businessId}`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <div
            className="size-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {businessName[0]?.toUpperCase()}
          </div>
          <span className="font-semibold text-sm">{businessName}</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold">{mode === 'login' ? 'Σύνδεση' : 'Εγγραφή'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login'
                ? 'Συνδεθείτε για να παραγγείλετε'
                : 'Δημιουργήστε λογαριασμό για να παραγγείλετε'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Όνομα</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Γιώργος"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Επώνυμο</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Παπαδόπουλος"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Κωδικός</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              style={{ backgroundColor: primaryColor }}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="size-4 animate-spin" />
                : mode === 'login' ? 'Σύνδεση' : 'Δημιουργία λογαριασμού'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Δεν έχετε λογαριασμό; ' : 'Έχετε ήδη λογαριασμό; '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              {mode === 'login' ? 'Εγγραφή' : 'Σύνδεση'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
