'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { saveBranding } from '@/lib/admin/actions'

interface ExtractedBranding {
  logoUrl: string | null
  primaryColor: string
  suggestedColors: string[]
  confidence: 'high' | 'medium' | 'low'
  signals: string[]
  fetchError: string | null
}

interface Props {
  businessName: string
  currentColor: string | null
  currentLogo: string | null
  extracted: ExtractedBranding | null
  isOnboarding?: boolean
}

const CONFIDENCE = {
  high:   { label: 'High confidence',                              ink: 'var(--success-ink)', bg: 'var(--success-bg)' },
  medium: { label: 'Medium confidence — review before saving',    ink: 'var(--pending-ink)', bg: 'var(--pending-bg)' },
  low:    { label: 'Low confidence — manual selection recommended', ink: 'var(--danger-ink)',  bg: 'var(--danger-bg)' },
}

function isValidHex(c: string) { return /^#[0-9A-Fa-f]{6}$/.test(c) }

// Derive a readable text color (white or dark) for a given background hex
function textOnColor(hex: string): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255
  return lum > 0.55 ? '#111111' : '#FFFFFF'
}

// Mini dashboard preview — fully self-contained, uses inline styles only (no CSS vars leaking)
function DashboardPreview({ color, logoUrl, businessName }: { color: string; logoUrl: string; businessName: string }) {
  const accent = isValidHex(color) ? color : '#4B5563'
  const accentText = textOnColor(accent)
  const accentSoft = `${accent}22`

  const STATUS_PILLS = [
    { label: 'Confirmed', bg: '#D1FAE5', ink: '#065F46' },
    { label: 'Pending',   bg: '#FEF3C7', ink: '#92400E' },
    { label: 'Cancelled', bg: '#FEF2F2', ink: '#7F1D1D' },
    { label: 'Ready',     bg: '#DBEAFE', ink: '#1E40AF' },
  ]

  return (
    <div style={{ display: 'flex', border: '1px solid #E8E8E8', borderRadius: 8, overflow: 'hidden', background: '#F5F5F5', fontSize: 12 }}>
      {/* Sidebar */}
      <div style={{ width: 148, background: '#F5F5F5', borderRight: '1px solid #E8E8E8', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ paddingBottom: 10, borderBottom: '1px solid #E8E8E8' }}>
          {logoUrl ? (
            <div style={{ position: 'relative', height: 26, width: '100%' }}>
              <Image src={logoUrl} alt={businessName} fill style={{ objectFit: 'contain', objectPosition: 'left center' }} unoptimized />
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{businessName}</div>
          )}
          <div style={{ fontSize: 9, color: '#6B6B6B', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin</div>
        </div>
        {/* Nav */}
        {['Overview', 'Reservations', 'Orders'].map((label, i) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 6px 5px 8px', borderRadius: 3, fontSize: 11,
            borderLeft: i === 0 ? `2px solid ${accent}` : '2px solid transparent',
            background: i === 0 ? accentSoft : 'transparent',
            color: i === 0 ? '#111' : '#6B6B6B',
            fontWeight: i === 0 ? 600 : 400,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: i === 0 ? accent : '#D1D5DB', flexShrink: 0 }} />
            {label}
          </div>
        ))}
        {/* Live pulse */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B6B6B' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
          Agent live
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[['Today', '12'], ['Orders', '8'], ['Pending', '3'], ['Revenue', '€240']].map(([l, v]) => (
            <div key={l} style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 6, padding: '7px 8px' }}>
              <div style={{ fontSize: 8, color: '#6B6B6B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#111', lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Table row with hover tint */}
        <div style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 70px', padding: '5px 10px', borderBottom: '1px solid #E8E8E8', background: '#FFF' }}>
            {['Customer', 'Time', 'Party', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 8, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {[
            { name: 'Αντρέας Κ.', time: '19:30', party: 4, status: 0 },
            { name: 'Maria S.',   time: '20:00', party: 2, status: 1 },
            { name: 'Nikos P.',   time: '20:30', party: 6, status: 3 },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 80px 70px',
              padding: '6px 10px', borderBottom: i < 2 ? '1px solid #E8E8E8' : 'none',
              background: i === 1 ? `${accent}14` : (i % 2 === 0 ? 'rgba(0,0,0,0.015)' : '#FFF'),
            }}>
              <div style={{ fontSize: 10, color: '#111' }}>{row.name}</div>
              <div style={{ fontSize: 10, color: '#3A3A3A' }}>{row.time}</div>
              <div style={{ fontSize: 10, color: '#6B6B6B' }}>{row.party} pax</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 5px', borderRadius: 999, fontSize: 8, fontWeight: 500, background: STATUS_PILLS[row.status].bg, color: STATUS_PILLS[row.status].ink }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
                {STATUS_PILLS[row.status].label}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: accent, color: accentText }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentText, opacity: 0.7 }} />
            Confirm
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500, border: '1px solid rgba(127,29,29,0.3)', color: '#7F1D1D', background: '#FFF' }}>
            Cancel
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500, border: '1px solid #E8E8E8', color: '#3A3A3A', background: '#FFF' }}>
            Reschedule
          </div>
        </div>

        {/* Focus ring demo */}
        <div style={{ fontSize: 9, color: '#6B6B6B' }}>
          Focus ring uses accent →{' '}
          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 3, border: `2px solid ${accent}`, fontSize: 9, color: '#111', background: '#FFF' }}>
            input
          </span>
        </div>
      </div>
    </div>
  )
}

// Onboarding step wrapper
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i < step ? 20 : 8,
          height: 4,
          borderRadius: 999,
          background: i < step ? 'var(--accent)' : (i === step ? 'var(--charcoal)' : 'var(--mist)'),
          transition: 'width 200ms ease, background 200ms ease',
        }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--ash)', marginLeft: 4 }}>Step {step + 1} of {total}</span>
    </div>
  )
}

export function BrandingPreview({
  businessName, currentColor, currentLogo, extracted, isOnboarding,
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const [importUrl, setImportUrl]   = useState('')
  const [color, setColor]           = useState(extracted?.primaryColor ?? currentColor ?? '#4B5563')
  const [logoUrl, setLogoUrl]       = useState(extracted?.logoUrl ?? currentLogo ?? '')
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [saved, setSaved]           = useState(false)
  const [showSignals, setShowSignals] = useState(false)

  function handleExtract() {
    const trimmed = importUrl.trim()
    if (!trimmed) return
    const url = new URL(window.location.href)
    url.searchParams.set('url', trimmed)
    if (isOnboarding) url.searchParams.set('onboarding', '1')
    router.push(url.toString())
  }

  function handleSave() {
    setSaveError(null)
    setSaved(false)
    start(async () => {
      try {
        await saveBranding(color, logoUrl || null)
        setSaved(true)
        if (isOnboarding) {
          setTimeout(() => router.push('/admin'), 1000)
        }
      } catch (e: any) {
        setSaveError(e?.message ?? 'Save failed')
      }
    })
  }

  const valid = isValidHex(color)
  const conf = extracted?.confidence

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {isOnboarding && <StepIndicator step={2} total={4} />}

      {/* ── Import card ──────────────────────────────────────── */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Import from website</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="url"
            placeholder="https://yourbusiness.com"
            value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleExtract()}
            style={{ flex: 1 }}
          />
          <button className="btn" data-variant="outline" onClick={handleExtract} disabled={!importUrl.trim()}>
            Extract
          </button>
        </div>

        {/* Fetch error */}
        {extracted?.fetchError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 6, background: 'var(--danger-bg)', color: 'var(--danger-ink)', fontSize: 13 }}>
            <AlertCircle size={14} aria-hidden />
            <span>Could not load the site: {extracted.fetchError}. Enter logo URL and color manually below.</span>
          </div>
        )}

        {/* Confidence badge + signals toggle */}
        {extracted && !extracted.fetchError && conf && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500,
                padding: '3px 9px', borderRadius: 999,
                background: CONFIDENCE[conf].bg, color: CONFIDENCE[conf].ink,
              }}>
                {conf === 'high' && <CheckCircle2 size={11} aria-hidden />}
                {conf !== 'high' && <AlertCircle size={11} aria-hidden />}
                {CONFIDENCE[conf].label}
              </span>
              <button
                style={{ fontSize: 11, color: 'var(--ash)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => setShowSignals(v => !v)}
              >
                {showSignals ? 'Hide' : 'Show'} details
              </button>
            </div>
            {showSignals && (
              <div style={{ fontSize: 11, color: 'var(--ash)', lineHeight: 1.7, paddingLeft: 4 }}>
                {extracted.signals.map((s, i) => <div key={i}>· {s}</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dashboard preview ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
          Live preview
        </div>
        <DashboardPreview color={color} logoUrl={logoUrl} businessName={businessName} />
      </div>

      {/* ── Review & override card ────────────────────────────── */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Review & override</div>

        {/* Color picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Primary color
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="color"
              value={valid ? color : '#4B5563'}
              onChange={e => setColor(e.target.value.toUpperCase())}
              style={{ width: 36, height: 36, border: '1px solid var(--mist)', borderRadius: 4, padding: 2, cursor: 'pointer', background: 'none', flexShrink: 0 }}
            />
            <input
              className="input"
              type="text"
              value={color}
              onChange={e => setColor(e.target.value.toUpperCase())}
              placeholder="#4B5563"
              style={{ width: 110 }}
            />
            {!valid && (
              <span style={{ fontSize: 12, color: 'var(--danger-ink)' }}>Enter a valid 6-digit hex</span>
            )}
          </div>

          {/* Suggested colors */}
          {extracted?.suggestedColors && extracted.suggestedColors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>
                {conf === 'low' ? 'Suggestions based on logo hue:' : 'Complementary variants:'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[extracted.primaryColor, ...extracted.suggestedColors].map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: c, cursor: 'pointer', flexShrink: 0,
                      border: color === c ? '2px solid var(--ink)' : '2px solid transparent',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      padding: 0,
                    }}
                    aria-label={`Use color ${c}`}
                  />
                ))}
                <span style={{ fontSize: 11, color: 'var(--ash)', alignSelf: 'center', marginLeft: 2 }}>
                  click to apply
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Logo URL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Logo URL
          </label>
          <input
            className="input"
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://yourbusiness.com/logo.svg"
          />
          {!logoUrl && (
            <span style={{ fontSize: 12, color: 'var(--ash)' }}>
              No logo found. Paste a direct URL to your logo (SVG or PNG). Leave empty to show business name.
            </span>
          )}
        </div>

        {/* Currently saved */}
        {(currentColor || currentLogo) && (
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--mist)', display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Currently saved</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentColor
                  ? <><div style={{ width: 14, height: 14, borderRadius: 3, background: currentColor, border: '1px solid var(--mist)' }} /><span style={{ fontSize: 12, color: 'var(--charcoal)', fontFamily: 'var(--font-mono, monospace)' }}>{currentColor}</span></>
                  : <span style={{ fontSize: 12, color: 'var(--ash)' }}>No color</span>
                }
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ash)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Logo</div>
              <span style={{ fontSize: 12, color: 'var(--ash)' }}>{currentLogo ? 'Set' : 'Not set'}</span>
            </div>
          </div>
        )}

        {/* Alerts */}
        {saveError && (
          <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 6, background: 'var(--danger-bg)', color: 'var(--danger-ink)', fontSize: 13 }}>
            <AlertCircle size={14} aria-hidden />
            {saveError}
          </div>
        )}
        {saved && (
          <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 6, background: 'var(--success-bg)', color: 'var(--success-ink)', fontSize: 13 }}>
            <CheckCircle2 size={14} aria-hidden />
            {isOnboarding ? 'Branding saved — taking you to your dashboard…' : 'Branding saved. Reload to see changes across the dashboard.'}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn"
            data-variant="primary"
            disabled={pending || !valid}
            onClick={handleSave}
          >
            {pending ? 'Saving…' : isOnboarding ? 'Approve & continue' : 'Approve & save'}
            {isOnboarding && !pending && <ArrowRight size={13} aria-hidden />}
          </button>
          {extracted && (
            <button
              className="btn"
              data-variant="ghost"
              onClick={() => {
                setColor(extracted.primaryColor)
                setLogoUrl(extracted.logoUrl ?? '')
              }}
            >
              Reset to extracted
            </button>
          )}
          {isOnboarding && (
            <button
              className="btn"
              data-variant="ghost"
              style={{ marginLeft: 'auto', color: 'var(--ash)' }}
              onClick={() => router.push('/admin')}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
