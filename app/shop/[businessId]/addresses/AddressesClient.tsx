'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, MapPin, Plus, Pencil, Trash2, Star, X, Check } from 'lucide-react'
import { AddressPickerMap } from '@/components/shop/AddressPickerMap'
import type { CustomerAddress } from '@/types/db'

const LABEL_PRESETS = ['Σπίτι', 'Εργασία', 'Άλλο']

interface Props {
  businessId:       string
  primaryColor:     string
  initialAddresses: CustomerAddress[]
}

type FormMode = 'add' | 'edit'

interface FormState {
  label:        string
  address_text: string
  lat:          number | null
  lng:          number | null
  instructions: string
  is_default:   boolean
}

const emptyForm = (): FormState => ({
  label:        'Σπίτι',
  address_text: '',
  lat:          null,
  lng:          null,
  instructions: '',
  is_default:   false,
})

export function AddressesClient({ businessId, primaryColor, initialAddresses }: Props) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>(initialAddresses)
  const [mode,      setMode]      = useState<FormMode | null>(null)
  const [editing,   setEditing]   = useState<CustomerAddress | null>(null)
  const [form,      setForm]      = useState<FormState>(emptyForm())
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setMode('add')
  }

  function openEdit(addr: CustomerAddress) {
    setEditing(addr)
    setForm({
      label:        addr.label,
      address_text: addr.address_text,
      lat:          addr.lat,
      lng:          addr.lng,
      instructions: addr.instructions ?? '',
      is_default:   addr.is_default,
    })
    setMode('edit')
  }

  function closeForm() {
    setMode(null)
    setEditing(null)
    setForm(emptyForm())
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.address_text.trim()) { toast.error('Εισάγετε διεύθυνση'); return }

    setSaving(true)
    try {
      const payload = {
        label:        form.label.trim() || 'Σπίτι',
        address_text: form.address_text.trim(),
        lat:          form.lat ?? null,
        lng:          form.lng ?? null,
        instructions: form.instructions.trim() || null,
        is_default:   form.is_default,
      }

      if (mode === 'add') {
        const res  = await fetch(`/api/shop/${businessId}/addresses`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)

        if (form.is_default) {
          setAddresses((prev) => [json.address, ...prev.map((a) => ({ ...a, is_default: false }))])
        } else {
          setAddresses((prev) => [...prev, json.address])
        }
        toast.success('Η διεύθυνση αποθηκεύτηκε')
      } else if (mode === 'edit' && editing) {
        const res  = await fetch(`/api/shop/${businessId}/addresses/${editing.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)

        setAddresses((prev) => {
          const updated = prev.map((a) => {
            if (a.id === editing.id) return { ...a, ...json.address }
            return form.is_default ? { ...a, is_default: false } : a
          })
          return updated
        })
        toast.success('Η διεύθυνση ενημερώθηκε')
      }

      closeForm()
    } catch (err: any) {
      toast.error(err.message ?? 'Σφάλμα')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/shop/${businessId}/addresses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setAddresses((prev) => prev.filter((a) => a.id !== id))
      toast.success('Η διεύθυνση διαγράφηκε')
    } catch (err: any) {
      toast.error(err.message ?? 'Σφάλμα')
    } finally {
      setDeleting(null)
    }
  }

  async function handleSetDefault(addr: CustomerAddress) {
    try {
      const res = await fetch(`/api/shop/${businessId}/addresses/${addr.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ label: addr.label, address_text: addr.address_text, is_default: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === addr.id })))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // ── Form panel ──────────────────────────────────────────────
  if (mode) {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {mode === 'add' ? 'Νέα διεύθυνση' : 'Επεξεργασία διεύθυνσης'}
          </h2>
          <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {/* Label presets */}
        <div className="space-y-1.5">
          <Label>Ετικέτα</Label>
          <div className="flex gap-2 mb-2">
            {LABEL_PRESETS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setForm((f) => ({ ...f, label: l }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.label === l
                    ? 'text-white border-transparent'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                style={form.label === l ? { backgroundColor: primaryColor } : {}}
              >
                {l}
              </button>
            ))}
          </div>
          <Input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="π.χ. Σπίτι"
            maxLength={60}
          />
        </div>

        {/* Address text */}
        <div className="space-y-1.5">
          <Label>Διεύθυνση</Label>
          <Input
            value={form.address_text}
            onChange={(e) => setForm((f) => ({ ...f, address_text: e.target.value }))}
            placeholder="π.χ. Σταδίου 28, Αθήνα"
            required
          />
        </div>

        {/* Map picker */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <MapPin className="size-3.5" /> Επιλογή στον χάρτη
          </Label>
          <AddressPickerMap
            initialLat={form.lat}
            initialLng={form.lng}
            onChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
          />
          {form.lat && form.lng && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="size-3" />
              Τοποθεσία επιλέχθηκε ({form.lat.toFixed(5)}, {form.lng.toFixed(5)})
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <Label>Οδηγίες παράδοσης (προαιρετικό)</Label>
          <Input
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            placeholder="π.χ. 3ος όροφος, κουδούνι Παπαδόπουλος"
            maxLength={300}
          />
        </div>

        {/* Default toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">Προεπιλεγμένη διεύθυνση</p>
            <p className="text-xs text-muted-foreground">Θα επιλεγεί αυτόματα στο checkout</p>
          </div>
          <Switch
            checked={form.is_default}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>
            Ακύρωση
          </Button>
          <Button
            type="submit"
            className="flex-1"
            style={{ backgroundColor: primaryColor }}
            disabled={saving || !form.address_text.trim()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Αποθήκευση'}
          </Button>
        </div>
      </form>
    )
  }

  // ── Address list ─────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {addresses.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <MapPin className="size-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Δεν έχετε αποθηκευμένες διευθύνσεις.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-xl border p-4 space-y-1 ${
                addr.is_default ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{addr.label}</p>
                      {addr.is_default && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: primaryColor }}>
                          Προεπιλογή
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{addr.address_text}</p>
                    {addr.instructions && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{addr.instructions}</p>
                    )}
                    {addr.lat && addr.lng && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        📍 {addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr)}
                      className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 transition-colors"
                      title="Ορισμός ως προεπιλογή"
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={deleting === addr.id}
                    className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {deleting === addr.id
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        className="w-full gap-2"
        style={{ backgroundColor: primaryColor }}
        onClick={openAdd}
      >
        <Plus className="size-4" />
        Προσθήκη διεύθυνσης
      </Button>
    </div>
  )
}
