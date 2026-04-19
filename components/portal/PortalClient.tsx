'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PhoneCall, Search } from 'lucide-react'
import type { Business } from '@/types/db'

interface Props {
  business: Pick<Business, 'id' | 'name' | 'primary_color' | 'logo_url' | 'phone'>
}

export function PortalClient({ business }: Props) {
  const router    = useRouter()
  const [ref, setRef] = useState('')
  const [error, setError] = useState('')

  function track() {
    const cleaned = ref.trim().toUpperCase()
    if (!cleaned.match(/^(ORD|RES)-\d+$/)) {
      setError('Μη έγκυρος αριθμός. Μορφή: ORD-0001 ή RES-0001')
      return
    }
    router.push(`/portal/${business.id}/track/${cleaned}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div
          className="flex size-8 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: business.primary_color ?? '#6366f1' }}
        >
          {business.name[0].toUpperCase()}
        </div>
        <span className="font-semibold text-sm">{business.name}</span>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
              <Search className="size-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Παρακολούθηση παραγγελίας</h1>
            <p className="text-sm text-muted-foreground">
              Εισάγετε τον αριθμό αναφοράς που λάβατε κατά την παραγγελία σας.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="π.χ. ORD-0001"
              value={ref}
              onChange={(e) => { setRef(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && track()}
              className="text-center font-mono text-lg h-12"
            />
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <Button onClick={track} size="lg" className="w-full">
              Αναζήτηση
            </Button>
          </div>

          {business.phone && (
            <p className="text-center text-xs text-muted-foreground">
              Χρειάζεστε βοήθεια;{' '}
              <a href={`tel:${business.phone}`} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                <PhoneCall className="size-3" /> {business.phone}
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
