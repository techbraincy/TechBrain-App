'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/db/supabase-server'
import { requireSession } from '@/lib/auth/session'
import { requireAdminSession } from '@/lib/auth/admin-session'
import type { OrderStatus, ReservationStatus } from './types'
import type { BusinessRole } from '@/types/db'

const ROLE_WEIGHT: Record<BusinessRole, number> = { owner: 3, manager: 2, staff: 1 }

// Used by /admin/[businessId] redirect stubs — kept during migration only.
async function authorize(
  businessId: string,
  minRole: BusinessRole = 'staff',
): Promise<{ userId: string; role: BusinessRole }> {
  const session = await requireSession()
  const business = session.businesses.find((b) => b.id === businessId)
  if (!business) throw new Error('Unauthorized: not a member of this business')
  if (ROLE_WEIGHT[business.role] < ROLE_WEIGHT[minRole])
    throw new Error(`Unauthorized: requires ${minRole} or higher`)
  return { userId: session.user.id, role: business.role }
}

// Used by /admin (cookie-based) pages — businessId is never accepted from the client.
export async function authorizeFromSession(
  minRole: BusinessRole = 'staff',
): Promise<{ userId: string; role: BusinessRole; businessId: string }> {
  const { session, business } = await requireAdminSession()
  if (ROLE_WEIGHT[business.role] < ROLE_WEIGHT[minRole])
    throw new Error(`Unauthorized: requires ${minRole} or higher`)
  return { userId: session.user.id, role: business.role, businessId: business.id }
}

// ── Reservation actions ──────────────────────────────────────────

export async function confirmReservation(id: string) {
  const { userId, businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const { error } = await admin
    .from('reservations')
    .update({
      status: 'confirmed' as ReservationStatus,
      confirmed_at: new Date().toISOString(),
      confirmed_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', businessId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/reservations')
}

export async function cancelReservation(id: string, reason?: string) {
  const { businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const note = reason ? `Cancelled: ${reason}` : 'Cancelled by staff'
  const { error } = await admin
    .from('reservations')
    .update({
      status: 'cancelled' as ReservationStatus,
      notes: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', businessId)
    .not('status', 'in', '(cancelled,completed,no_show)')
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/reservations')
}

export async function rescheduleReservation(id: string, newDate: string, newTime: string) {
  const { businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const reservedAt = new Date(`${newDate}T${newTime}:00`).toISOString()
  const { error } = await admin
    .from('reservations')
    .update({
      reserved_at: reservedAt,
      status: 'pending' as ReservationStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', businessId)
    .not('status', 'in', '(cancelled,completed,no_show)')
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/reservations')
}

export async function markReservationCompleted(id: string) {
  const { businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const { error } = await admin
    .from('reservations')
    .update({ status: 'completed' as ReservationStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/reservations')
}

export async function setReservationNote(id: string, note: string) {
  const { businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const { error } = await admin
    .from('reservations')
    .update({ notes: note, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/reservations')
}

// ── Order actions ────────────────────────────────────────────────

export async function setOrderStatus(id: string, status: OrderStatus) {
  const { userId, businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'accepted') {
    patch.accepted_at = new Date().toISOString()
    patch.accepted_by = userId
  }
  const { error } = await admin
    .from('orders')
    .update(patch)
    .eq('id', id)
    .eq('business_id', businessId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/orders')
}

export async function setOrderNote(id: string, note: string) {
  const { businessId } = await authorizeFromSession()
  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ notes: note, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
}

// ── Branding actions ─────────────────────────────────────────────

export async function saveBranding(primaryColor: string, logoUrl: string | null) {
  const { businessId } = await authorizeFromSession('manager')
  const admin = createAdminClient()
  const { error } = await admin
    .from('businesses')
    .update({
      primary_color: primaryColor || null,
      logo_url: logoUrl || null,
    })
    .eq('id', businessId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/branding')
}

// ── Color helpers ────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

function isUsableAccent(hex: string): boolean {
  const [, s, l] = hexToHsl(hex)
  return l >= 0.1 && l <= 0.88 && s >= 0.15
}

function resolveUrl(raw: string, base: string): string {
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`
}

function extractSvgColors(svg: string): string[] {
  const colors: string[] = []
  const hexes = [...svg.matchAll(/(?:fill|stroke|color|stop-color)\s*[=:]\s*["']?(#[0-9A-Fa-f]{6})\b/gi)]
  hexes.forEach(m => {
    const c = `#${m[1].slice(1).toUpperCase()}`
    if (isUsableAccent(c) && !colors.includes(c)) colors.push(c)
  })
  return colors
}

function buildSuggestions(baseColor: string): string[] {
  const [h, s, l] = hexToHsl(baseColor)
  const suggestions: string[] = []
  suggestions.push(hslToHex((h + 15) % 360, Math.min(s + 0.1, 1), Math.max(l - 0.05, 0.15)))
  suggestions.push(hslToHex((h - 15 + 360) % 360, Math.min(s + 0.05, 1), Math.max(l - 0.05, 0.15)))
  suggestions.push(hslToHex(h, Math.min(s + 0.15, 1), Math.max(l - 0.15, 0.12)))
  return [...new Set(suggestions)].filter(c => c !== baseColor && isUsableAccent(c)).slice(0, 3)
}

export async function importBrandingFromUrl(url: string): Promise<{
  logoUrl: string | null
  primaryColor: string
  suggestedColors: string[]
  confidence: 'high' | 'medium' | 'low'
  signals: string[]
  fetchError: string | null
}> {
  await authorizeFromSession('manager')

  const signals: string[] = []
  let logoUrl: string | null = null
  let primaryColor = '#4B5563'
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let fetchError: string | null = null

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandingImporter/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Site returned ${res.status} ${res.statusText}`)
    const html = await res.text()
    const base = new URL(url).origin

    const themeRe = [
      /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i,
    ]
    for (const re of themeRe) {
      const m = html.match(re)
      if (m) {
        const c = m[1].trim()
        if (/^#[0-9A-Fa-f]{6}$/.test(c) && isUsableAccent(c)) {
          primaryColor = c.toUpperCase()
          confidence = 'high'
          signals.push(`theme-color meta → ${primaryColor}`)
        } else {
          signals.push(`theme-color meta found but not usable (${c}) — skipped`)
        }
        break
      }
    }

    const logoPatterns = [
      /<img[^>]+src=["']([^"']*\blogo\b[^"']*\.(svg|png|webp|jpg)[^"']*)["']/i,
      /<img[^>]+class=["'][^"']*\blogo\b[^"']*["'][^>]+src=["']([^"']+)["']/i,
      /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*\blogo\b[^"']*["']/i,
    ]
    for (const re of logoPatterns) {
      const m = html.match(re)
      if (m) {
        logoUrl = resolveUrl(m[1], base)
        signals.push(`logo <img> → ${logoUrl}`)
        break
      }
    }

    if (!logoUrl) {
      const m = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i)
      if (m) {
        logoUrl = resolveUrl(m[1], base)
        signals.push(`apple-touch-icon → ${logoUrl}`)
      }
    }

    if (!logoUrl) {
      const svgIcon = html.match(/<link[^>]+type=["']image\/svg\+xml["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+\.svg)["'][^>]+rel=["'][^"']*icon[^"']*["']/i)
      if (svgIcon) {
        logoUrl = resolveUrl(svgIcon[1], base)
        signals.push(`SVG favicon → ${logoUrl}`)
      }
    }
    if (!logoUrl) {
      const anyIcon = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i)
      if (anyIcon) {
        logoUrl = resolveUrl(anyIcon[1], base)
        signals.push(`favicon fallback → ${logoUrl}`)
      }
    }

    if (logoUrl?.endsWith('.svg') && confidence === 'low') {
      try {
        const svgRes = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) })
        if (svgRes.ok) {
          const svg = await svgRes.text()
          const svgColors = extractSvgColors(svg)
          if (svgColors.length > 0) {
            primaryColor = svgColors[0]
            confidence = 'medium'
            signals.push(`SVG fill colors → ${svgColors.join(', ')} · using ${primaryColor}`)
          } else {
            signals.push('SVG fetched but no usable fill colors (single-color or near-black logo)')
          }
        }
      } catch {
        signals.push('SVG fetch timed out — skipping color extraction from logo')
      }
    }

    if (confidence === 'low') {
      const styleContent = [
        ...(html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []),
        ...(html.match(/style=["']([^"']+)["']/gi) ?? []),
      ].join(' ')

      const hexMatches = [...styleContent.matchAll(/#([0-9A-Fa-f]{6})\b/g)]
        .map(m => `#${m[1].toUpperCase()}`)
        .filter(isUsableAccent)

      const freq: Record<string, number> = {}
      hexMatches.forEach(c => { freq[c] = (freq[c] || 0) + 1 })
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])

      if (sorted.length > 0) {
        primaryColor = sorted[0][0]
        confidence = sorted[0][1] >= 3 ? 'medium' : 'low'
        signals.push(`CSS accent scan → ${primaryColor} (×${sorted[0][1]})`)
        sorted.slice(1, 4).forEach(([c, n]) => signals.push(`  candidate: ${c} (×${n})`))
      }
    }

    if (signals.length === 0) signals.push('No signals found — using neutral fallback')
  } catch (e: any) {
    fetchError = e.message ?? 'Could not load the website'
    signals.push(`Fetch failed: ${fetchError}`)
  }

  const suggestedColors = confidence !== 'high' ? buildSuggestions(primaryColor) : []
  return { logoUrl, primaryColor, suggestedColors, confidence, signals, fetchError }
}
