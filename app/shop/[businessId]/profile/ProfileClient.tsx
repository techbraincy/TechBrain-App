'use client'

import { useState }      from 'react'
import { useRouter }     from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { toast }         from 'sonner'
import Link              from 'next/link'
import {
  ChevronLeft, LogOut, Loader2, MapPin, Package,
  Bell, User, ChevronRight,
} from 'lucide-react'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getInitials } from '@/lib/utils'
import type { ShopCustomer } from '@/lib/shop/auth'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Props {
  businessId:   string
  primaryColor: string
  customer:     ShopCustomer
}

export function ProfileClient({ businessId, primaryColor, customer }: Props) {
  const router = useRouter()
  const [firstName,    setFirstName]    = useState(customer.first_name)
  const [lastName,     setLastName]     = useState(customer.last_name)
  const [phone,        setPhone]        = useState(customer.phone ?? '')
  const [lang,         setLang]         = useState(customer.preferred_language)
  const [notifyOrders, setNotifyOrders] = useState(customer.notify_order_updates)
  const [notifyPromos, setNotifyPromos] = useState(customer.notify_promotions)
  const [saving,      setSaving]      = useState(false)
  const [loggingOut,  setLoggingOut]  = useState(false)

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch(`/api/shop/${businessId}/profile`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error((await res.json()).error)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await patch({ first_name: firstName, last_name: lastName, phone: phone || null, preferred_language: lang })
      toast.success('Το προφίλ ενημερώθηκε')
      router.refresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push(`/shop/${businessId}`)
    router.refresh()
  }

  const initials = getInitials(`${firstName} ${lastName}`)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="size-5 text-gray-700" />
          </button>
          <h1 className="text-sm font-bold text-gray-900 flex-1">Το προφίλ μου</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-5">
        {/* Avatar + name hero */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="size-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {initials}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{firstName} {lastName}</p>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <User className="size-4" style={{ color: primaryColor }} />
            Στοιχεία λογαριασμού
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Όνομα</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Επώνυμο</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Τηλέφωνο</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+30 69..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Γλώσσα εφαρμογής</Label>
            <div className="flex gap-2">
              {(['el', 'en'] as const).map((l) => (
                <button
                  key={l} type="button"
                  onClick={() => setLang(l)}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all active:scale-95"
                  style={lang === l ? { backgroundColor: primaryColor, color: 'white', borderColor: 'transparent' } : {}}
                >
                  {l === 'el' ? '🇬🇷 Ελληνικά' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Αποθήκευση'}
          </button>
        </form>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Bell className="size-4" style={{ color: primaryColor }} />
            Ειδοποιήσεις
          </h2>

          {[
            { label: 'Ενημερώσεις παραγγελίας', sub: 'Κατάσταση και delivery', val: notifyOrders, key: 'notify_order_updates', set: setNotifyOrders },
            { label: 'Προσφορές & κουπόνια', sub: 'Εκπτώσεις και ειδικές προσφορές', val: notifyPromos, key: 'notify_promotions', set: setNotifyPromos },
          ].map(({ label, sub, val, key, set }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
              <Switch
                checked={val}
                onCheckedChange={(v) => {
                  set(v)
                  patch({ first_name: firstName, last_name: lastName, [key]: v }).catch(() => {})
                }}
              />
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {[
            { href: `/shop/${businessId}/orders`, icon: <Package className="size-4 text-gray-400" />, label: 'Ιστορικό παραγγελιών' },
            { href: `/shop/${businessId}/addresses`, icon: <MapPin className="size-4 text-gray-400" />, label: 'Διευθύνσεις delivery' },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3.5 px-5 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
              {icon}
              <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
              <ChevronRight className="size-4 text-gray-400" />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-100 text-red-500 font-semibold text-sm hover:bg-red-50 active:scale-95 transition-all"
        >
          {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Αποσύνδεση
        </button>
      </main>
    </div>
  )
}
