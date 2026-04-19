'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Globe, Eye, EyeOff, Pencil, Trash2, Plus, GripVertical,
  Tag, Package, ChevronDown, ChevronRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ShopConfig, MenuCategory, MenuItem } from '@/types/db'

interface Props {
  businessId:         string
  shopConfig:         ShopConfig | null
  initialCategories:  MenuCategory[]
  initialItems:       MenuItem[]
  shopUrl:            string
  slugUrl:            string | null
}

// ── Settings tab ────────────────────────────────────────────────────────────

interface BannerItem {
  id: string; title: string; description: string
  bg_color?: string | null; text_color?: string | null; emoji?: string | null
  image_url?: string | null; link_cat_id?: string | null
}

function SettingsTab({ businessId, shopConfig, shopUrl, slugUrl }: {
  businessId: string
  shopConfig: ShopConfig | null
  shopUrl: string
  slugUrl: string | null
}) {
  const [published,    setPublished]    = useState(shopConfig?.is_published ?? true)
  const [announcement, setAnnouncement] = useState(shopConfig?.announcement ?? '')
  const [seoTitle,     setSeoTitle]     = useState(shopConfig?.seo_title ?? '')
  const [seoDesc,      setSeoDesc]      = useState(shopConfig?.seo_description ?? '')
  // Branding
  const [logoUrl,      setLogoUrl]      = useState(shopConfig?.logo_url ?? '')
  const [coverUrl,     setCoverUrl]     = useState(shopConfig?.cover_image_url ?? '')
  const [subtitle,     setSubtitle]     = useState(shopConfig?.subtitle ?? '')
  const [heroTagline,  setHeroTagline]  = useState(shopConfig?.hero_tagline ?? '')
  const [banners,      setBanners]      = useState<BannerItem[]>(shopConfig?.banners ?? [])
  const [saving,       setSaving]       = useState(false)

  async function save(patch: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/shop`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Αποθηκεύτηκε')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(val: boolean) {
    setPublished(val)
    await save({ is_published: val })
  }

  return (
    <div className="space-y-4">
      {/* Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ορατότητα</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Shop δημοσιευμένο</p>
              <p className="text-xs text-muted-foreground">Ορατό στους πελάτες</p>
            </div>
            <Switch checked={published} onCheckedChange={togglePublished} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Σύνδεσμοι</p>
            <div className="rounded-lg border border-border divide-y divide-border text-xs">
              <a href={shopUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors group">
                <Globe className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate text-muted-foreground font-mono">{shopUrl}</span>
                <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">↗</span>
              </a>
              {slugUrl && (
                <a href={slugUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors group">
                  <Globe className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate text-muted-foreground font-mono">{slugUrl}</span>
                  <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">↗</span>
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ανακοίνωση</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Εμφανίζεται ως banner στην κορυφή του shop (π.χ. «Κλειστά Δευτέρα»)
          </p>
          <Input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="π.χ. Σήμερα κλειστά — ανοίγουμε αύριο στις 12:00"
            maxLength={200}
          />
          <Button size="sm" onClick={() => save({ announcement: announcement || null })} disabled={saving}>
            Αποθήκευση
          </Button>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Branding & Εμφάνιση</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">URL λογοτύπου</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL εξώφυλλου (cover image)</Label>
            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Υπότιτλος (κάτω από χαιρετισμό)</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="π.χ. Τι θα σου φτιάξουμε σήμερα;" maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hero tagline (πάνω στο cover image)</Label>
            <Input value={heroTagline} onChange={(e) => setHeroTagline(e.target.value)} placeholder="π.χ. Γεύσεις που αγαπάς" maxLength={100} />
          </div>
          <Button size="sm" disabled={saving} onClick={() => save({
            logo_url: logoUrl || null,
            cover_image_url: coverUrl || null,
            subtitle: subtitle || null,
            hero_tagline: heroTagline || null,
          })}>
            Αποθήκευση branding
          </Button>

          {/* Banners */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Κάρτες προσφορών (banners)</Label>
              <Button size="sm" variant="outline" onClick={() => {
                const title = prompt('Τίτλος banner:')
                if (!title) return
                const desc  = prompt('Περιγραφή:') ?? ''
                const emoji = prompt('Emoji (προαιρετικό):') ?? '🍽️'
                setBanners((prev) => [...prev, {
                  id: crypto.randomUUID(), title, description: desc, emoji,
                  bg_color: '#FFF5E4', text_color: '#1A1A1A',
                }])
              }}>
                <Plus className="size-3.5 mr-1" /> Νέο banner
              </Button>
            </div>
            {banners.length === 0 && (
              <p className="text-xs text-muted-foreground">Δεν υπάρχουν banners. Προσθέστε κάρτες προσφορών.</p>
            )}
            {banners.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-lg">{b.emoji ?? '🍽️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{b.title}</p>
                  {b.description && <p className="text-xs text-muted-foreground truncate">{b.description}</p>}
                </div>
                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setBanners((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {banners.length > 0 && (
              <Button size="sm" disabled={saving} onClick={() => save({ banners })}>
                Αποθήκευση banners
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">SEO / Κοινοποίηση</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Τίτλος σελίδας</Label>
            <Input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Αφήστε κενό για να χρησιμοποιηθεί το όνομα της επιχείρησης"
              maxLength={70}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Περιγραφή</Label>
            <Input
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value)}
              placeholder="Σύντομη περιγραφή για μηχανές αναζήτησης"
              maxLength={160}
            />
          </div>
          <Button size="sm"
            onClick={() => save({ seo_title: seoTitle || null, seo_description: seoDesc || null })}
            disabled={saving}>
            Αποθήκευση
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Catalog tab ──────────────────────────────────────────────────────────────

type ItemWithCat = MenuItem & { menu_categories?: { name_el: string } | null }

function CatalogTab({ businessId, initialCategories, initialItems }: {
  businessId:        string
  initialCategories: MenuCategory[]
  initialItems:      MenuItem[]
}) {
  const [categories,  setCategories]  = useState<MenuCategory[]>(initialCategories)
  const [items,       setItems]       = useState<ItemWithCat[]>(initialItems)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  // Category dialog
  const [catDialog,   setCatDialog]   = useState(false)
  const [editCat,     setEditCat]     = useState<MenuCategory | null>(null)
  const [catNameEl,   setCatNameEl]   = useState('')
  const [catNameEn,   setCatNameEn]   = useState('')
  const [catSaving,   setCatSaving]   = useState(false)

  // Item dialog
  const [itemDialog,  setItemDialog]  = useState(false)
  const [editItem,    setEditItem]    = useState<ItemWithCat | null>(null)
  const [itemCat,     setItemCat]     = useState('')
  const [itemNameEl,  setItemNameEl]  = useState('')
  const [itemNameEn,  setItemNameEn]  = useState('')
  const [itemDescEl,  setItemDescEl]  = useState('')
  const [itemPrice,   setItemPrice]   = useState('')
  const [itemAvail,   setItemAvail]   = useState(true)
  const [itemSaving,  setItemSaving]  = useState(false)

  function openNewCat() {
    setEditCat(null); setCatNameEl(''); setCatNameEn(''); setCatDialog(true)
  }
  function openEditCat(cat: MenuCategory) {
    setEditCat(cat); setCatNameEl(cat.name_el); setCatNameEn(cat.name_en ?? ''); setCatDialog(true)
  }

  async function saveCat() {
    if (!catNameEl.trim()) return
    setCatSaving(true)
    try {
      if (editCat) {
        const res = await fetch(`/api/businesses/${businessId}/catalog/categories/${editCat.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name_el: catNameEl.trim(), name_en: catNameEn.trim() || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCategories((prev) => prev.map((c) => c.id === editCat.id ? data : c))
      } else {
        const res = await fetch(`/api/businesses/${businessId}/catalog/categories`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name_el: catNameEl.trim(), name_en: catNameEn.trim() || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCategories((prev) => [...prev, data])
      }
      setCatDialog(false)
      toast.success(editCat ? 'Κατηγορία ενημερώθηκε' : 'Κατηγορία προστέθηκε')
    } catch (e: any) { toast.error(e.message) }
    finally { setCatSaving(false) }
  }

  async function deleteCat(cat: MenuCategory) {
    if (!confirm(`Διαγραφή κατηγορίας "${cat.name_el}";`)) return
    const res = await fetch(`/api/businesses/${businessId}/catalog/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      toast.success('Κατηγορία διαγράφηκε')
    } else {
      toast.error('Σφάλμα διαγραφής')
    }
  }

  function openNewItem(catId?: string) {
    setEditItem(null)
    setItemCat(catId ?? '')
    setItemNameEl(''); setItemNameEn(''); setItemDescEl('')
    setItemPrice(''); setItemAvail(true)
    setItemDialog(true)
  }
  function openEditItem(item: ItemWithCat) {
    setEditItem(item)
    setItemCat(item.category_id ?? '')
    setItemNameEl(item.name_el); setItemNameEn(item.name_en ?? '')
    setItemDescEl(item.description_el ?? ''); setItemPrice(String(item.price))
    setItemAvail(item.is_available); setItemDialog(true)
  }

  async function saveItem() {
    if (!itemNameEl.trim() || !itemPrice) return
    const price = parseFloat(itemPrice)
    if (isNaN(price)) { toast.error('Μη έγκυρη τιμή'); return }
    setItemSaving(true)
    try {
      const payload = {
        category_id:    itemCat || null,
        name_el:        itemNameEl.trim(),
        name_en:        itemNameEn.trim() || null,
        description_el: itemDescEl.trim() || null,
        price,
        is_available:   itemAvail,
      }
      if (editItem) {
        const res = await fetch(`/api/businesses/${businessId}/catalog/items/${editItem.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setItems((prev) => prev.map((i) => i.id === editItem.id ? data : i))
      } else {
        const res = await fetch(`/api/businesses/${businessId}/catalog/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setItems((prev) => [...prev, data])
      }
      setItemDialog(false)
      toast.success(editItem ? 'Προϊόν ενημερώθηκε' : 'Προϊόν προστέθηκε')
    } catch (e: any) { toast.error(e.message) }
    finally { setItemSaving(false) }
  }

  async function deleteItem(item: ItemWithCat) {
    if (!confirm(`Διαγραφή "${item.name_el}";`)) return
    const res = await fetch(`/api/businesses/${businessId}/catalog/items/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success('Προϊόν διαγράφηκε')
    } else {
      toast.error('Σφάλμα διαγραφής')
    }
  }

  async function toggleAvail(item: ItemWithCat) {
    const res = await fetch(`/api/businesses/${businessId}/catalog/items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !item.is_available }),
    })
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
    }
  }

  const uncategorized = items.filter((i) => !i.category_id)

  return (
    <div className="space-y-4">
      {/* Top actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {categories.length} κατηγορίες · {items.length} προϊόντα
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openNewCat}>
            <Plus className="size-3.5 mr-1" /> Κατηγορία
          </Button>
          <Button size="sm" onClick={() => openNewItem()}>
            <Plus className="size-3.5 mr-1" /> Προϊόν
          </Button>
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id)
        const isOpen   = expandedCat === cat.id
        return (
          <Card key={cat.id} className="overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedCat(isOpen ? null : cat.id)}
            >
              <Tag className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.name_el}</p>
                {cat.name_en && <p className="text-xs text-muted-foreground">{cat.name_en}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{catItems.length} είδη</span>
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="size-7"
                  onClick={() => openNewItem(cat.id)}>
                  <Plus className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7"
                  onClick={() => openEditCat(cat)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive"
                  onClick={() => deleteCat(cat)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </div>

            {isOpen && catItems.length > 0 && (
              <div className="divide-y divide-border border-t border-border">
                {catItems.map((item) => (
                  <ItemRow key={item.id} item={item} onEdit={() => openEditItem(item)}
                    onDelete={() => deleteItem(item)} onToggle={() => toggleAvail(item)} />
                ))}
              </div>
            )}
            {isOpen && catItems.length === 0 && (
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground text-center">
                Καμία εγγραφή · <button className="underline" onClick={() => openNewItem(cat.id)}>Προσθήκη</button>
              </div>
            )}
          </Card>
        )
      })}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
            <Package className="size-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium flex-1">Χωρίς κατηγορία</p>
            <span className="text-xs text-muted-foreground">{uncategorized.length} είδη</span>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {uncategorized.map((item) => (
              <ItemRow key={item.id} item={item} onEdit={() => openEditItem(item)}
                onDelete={() => deleteItem(item)} onToggle={() => toggleAvail(item)} />
            ))}
          </div>
        </Card>
      )}

      {categories.length === 0 && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Δεν υπάρχουν προϊόντα</p>
          <p className="text-xs text-muted-foreground mt-1">Προσθέστε κατηγορίες και προϊόντα για να ξεκινήσετε</p>
        </div>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? 'Επεξεργασία κατηγορίας' : 'Νέα κατηγορία'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Όνομα (ελληνικά) *</Label>
              <Input value={catNameEl} onChange={(e) => setCatNameEl(e.target.value)} placeholder="π.χ. Ορεκτικά" />
            </div>
            <div className="space-y-1.5">
              <Label>Όνομα (αγγλικά)</Label>
              <Input value={catNameEn} onChange={(e) => setCatNameEn(e.target.value)} placeholder="e.g. Starters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCatDialog(false)}>Ακύρωση</Button>
            <Button size="sm" onClick={saveCat} disabled={catSaving || !catNameEl.trim()}>
              {editCat ? 'Αποθήκευση' : 'Προσθήκη'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Επεξεργασία προϊόντος' : 'Νέο προϊόν'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Κατηγορία</Label>
              <select
                value={itemCat}
                onChange={(e) => setItemCat(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Χωρίς κατηγορία</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_el}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Όνομα (ελ) *</Label>
                <Input value={itemNameEl} onChange={(e) => setItemNameEl(e.target.value)} placeholder="π.χ. Σαλάτα" />
              </div>
              <div className="space-y-1.5">
                <Label>Όνομα (en)</Label>
                <Input value={itemNameEn} onChange={(e) => setItemNameEn(e.target.value)} placeholder="e.g. Salad" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Περιγραφή</Label>
              <Input value={itemDescEl} onChange={(e) => setItemDescEl(e.target.value)} placeholder="Σύντομη περιγραφή" />
            </div>
            <div className="space-y-1.5">
              <Label>Τιμή (€) *</Label>
              <Input
                type="number" min="0" step="0.01"
                value={itemPrice} onChange={(e) => setItemPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Διαθέσιμο</Label>
              <Switch checked={itemAvail} onCheckedChange={setItemAvail} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setItemDialog(false)}>Ακύρωση</Button>
            <Button size="sm" onClick={saveItem} disabled={itemSaving || !itemNameEl.trim() || !itemPrice}>
              {editItem ? 'Αποθήκευση' : 'Προσθήκη'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ItemRow({ item, onEdit, onDelete, onToggle }: {
  item:     ItemWithCat
  onEdit:   () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.name_el}</p>
          {!item.is_available && (
            <Badge variant="secondary" className="text-[10px] py-0">Μη διαθέσιμο</Badge>
          )}
        </div>
        {item.description_el && (
          <p className="text-xs text-muted-foreground truncate">{item.description_el}</p>
        )}
      </div>
      <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(item.price)}</span>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="size-7" onClick={onToggle} title={item.is_available ? 'Απόσυρση' : 'Ενεργοποίηση'}>
          {item.is_available ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
        </Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Root component ───────────────────────────────────────────────────────────

export function ShopAdminClient({ businessId, shopConfig, initialCategories, initialItems, shopUrl, slugUrl }: Props) {
  return (
    <Tabs defaultValue="catalog">
      <TabsList>
        <TabsTrigger value="catalog">Κατάλογος</TabsTrigger>
        <TabsTrigger value="settings">Ρυθμίσεις Shop</TabsTrigger>
      </TabsList>

      <TabsContent value="catalog" className="mt-4">
        <CatalogTab
          businessId={businessId}
          initialCategories={initialCategories}
          initialItems={initialItems}
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <SettingsTab
          businessId={businessId}
          shopConfig={shopConfig}
          shopUrl={shopUrl}
          slugUrl={slugUrl}
        />
      </TabsContent>
    </Tabs>
  )
}
