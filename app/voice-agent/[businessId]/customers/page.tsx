import { requireBusinessAccess } from '@/lib/auth/session'
import { createClient } from '@/lib/db/supabase-server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { Phone, User, Clock } from 'lucide-react'

interface Props { params: { businessId: string } }

export default async function CustomersPage({ params }: Props) {
  await requireBusinessAccess(params.businessId)
  const supabase = createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      orders:orders(count),
      reservations:reservations(count)
    `)
    .eq('business_id', params.businessId)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Πελάτες</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{customers?.length ?? 0} καταχωρημένοι πελάτες</p>
      </div>

      {!customers?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <User className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Δεν υπάρχουν πελάτες ακόμα.</p>
          <p className="text-xs text-muted-foreground mt-1">Προστίθενται αυτόματα μέσω κλήσεων και παραγγελιών.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-0">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {(c.name?.[0] ?? c.phone?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3" /> {c.phone ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary" className="text-xs">{c.language === 'el' ? '🇬🇷 ΕΛ' : '🇬🇧 EN'}</Badge>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" /> {formatDateTime(c.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
