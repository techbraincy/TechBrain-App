'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Globe, Palette, LayoutDashboard } from 'lucide-react'
import { saveBranding, importBrandingFromUrl } from '@/lib/admin/actions'

interface Props {
  params: { businessId: string }
}

type Step = 'welcome' | 'website' | 'branding' | 'confirm' | 'done'

interface ExtractedBranding {
  logoUrl: string | null
  primaryColor: string
  suggestedColors: string[]
  confidence: 'high' | 'medium' | 'low'
  signals: string[]
  fetchError: string | null
}

function isValidHex(c: string) { return /^#[0-9A-Fa-f]{6}$/.test(c) }

function textOnColor(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55 ? '#111111' : '#FFFFFF'
}

const STEPS: { id: Step; label: string; icon: typeof Globe }[] = [
  { id: 'welcome',  label: 'Welcome',  icon: LayoutDashboard },
  { id: 'website',  label: 'Website',  icon: Globe },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'confirm',  label: 'Confirm',  icon: Check as any },
]

function Progress({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {STEPS.map((s, i) => {
        const done = i < idx
        const active = i === idx
        const Icon = s.icon
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--accent)' : active ? 'var(--ink)' : 'var(--mist)',
                color: done || active ? '#FFF' : 'var(--ash)',
                transition: 'background 250ms ease',
              }}>
                {done ? <Check size={14} aria-hidden /> : <Icon size={14} aria-hidden />}
              </div>
              <span style={{ fontSize: 10, color: active ? 'var(--ink)' : 'var(--ash)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--accent)' : 'var(--mist)', margin: '0 8px', marginBottom: 18, transition: 'background 250ms ease' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OnboardingPage({ params }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [extracted, setExtracted] = useState<ExtractedBranding | null>(null)
  const [color, setColor] = useState('#4B5563')
  const [logoUrl, setLogoUrl] = useState('')
  const [pending, start] = useTransition()
  const [extractError, setExtractError] = useState<string | null>(null)

  function handleExtract() {
    const trimmed = websiteUrl.trim()
    if (!trimmed) return
    setExtractError(null)
    start(async () => {
      try {
        const result = await importBrandingFromUrl(trimmed)
        setExtracted(result)
        setColor(result.primaryColor)
        setLogoUrl(result.logoUrl ?? '')
        if (result.fetchError) setExtractError(result.fetchError)
        setStep('branding')
      } catch (e: any) {
        setExtractError(e.message ?? 'Failed to extract branding')
        setStep('branding')
      }
    })
  }

  function handleSave() {
    start(async () => {
      try {
        await saveBranding(color, logoUrl || null)
        setStep('done')
      } catch (e: any) {
        setExtractError(e.message ?? 'Save failed')
      }
    })
  }

  const valid = isValidHex(color)
  const accent = valid ? color : '#4B5563'
  const accentText = textOnColor(accent)

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Dashboard Setup
          </div>
        </div>

        <Progress current={step} />

        {/* ── Step: Welcome ──────────────────────────────────── */}
        {step === 'welcome' && (
          <div style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#111' }}>
                Welcome to your dashboard
              </h1>
              <p style={{ fontSize: 14, color: '#6B6B6B', margin: 0, lineHeight: 1.6 }}>
                Let's set it up in 2 minutes. We'll import your branding from your website so the dashboard looks like your own software.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: Globe, text: 'Import logo and colors from your website' },
                { icon: Palette, text: 'Preview how the dashboard looks with your branding' },
                { icon: LayoutDashboard, text: 'Go live with a branded admin experience' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#3A3A3A' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F5F5F5', border: '1px solid #E8E8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color="#6B6B6B" aria-hidden />
                  </div>
                  {text}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep('website')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: accent, color: accentText, border: 'none', cursor: 'pointer' }}
              >
                Get started <ArrowRight size={14} aria-hidden />
              </button>
              <button
                onClick={() => router.push(`/admin/${params.businessId}`)}
                style={{ padding: '10px 16px', borderRadius: 6, fontSize: 13, color: '#6B6B6B', background: 'none', border: '1px solid #E8E8E8', cursor: 'pointer' }}
              >
                Skip setup
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Website ──────────────────────────────────── */}
        {step === 'website' && (
          <div style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#111' }}>
                What's your website?
              </h2>
              <p style={{ fontSize: 13, color: '#6B6B6B', margin: 0 }}>
                We'll automatically extract your logo and brand color.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
                Website URL
              </label>
              <input
                type="url"
                placeholder="https://yourbusiness.com"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtract()}
                style={{ height: 40, padding: '0 12px', border: '1px solid #E8E8E8', borderRadius: 6, fontSize: 14, color: '#111', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            {extractError && (
              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#FEF2F2', color: '#7F1D1D', fontSize: 13 }}>
                {extractError} — you can still set colors manually in the next step.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleExtract}
                disabled={pending || !websiteUrl.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: accent, color: accentText, border: 'none', cursor: pending ? 'wait' : 'pointer', opacity: (!websiteUrl.trim() || pending) ? 0.6 : 1 }}
              >
                {pending ? 'Extracting…' : <>Extract branding <ArrowRight size={14} aria-hidden /></>}
              </button>
              <button
                onClick={() => setStep('branding')}
                style={{ padding: '10px 16px', borderRadius: 6, fontSize: 13, color: '#6B6B6B', background: 'none', border: '1px solid #E8E8E8', cursor: 'pointer' }}
              >
                Set manually
              </button>
              <button onClick={() => setStep('welcome')} style={{ marginLeft: 'auto', padding: '10px 12px', borderRadius: 6, fontSize: 13, color: '#6B6B6B', background: 'none', border: 'none', cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Branding ─────────────────────────────────── */}
        {step === 'branding' && (
          <div style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#111' }}>
                {extracted && !extracted.fetchError ? 'Review your branding' : 'Set your branding'}
              </h2>
              <p style={{ fontSize: 13, color: '#6B6B6B', margin: 0 }}>
                {extracted && !extracted.fetchError
                  ? `We found ${extracted.confidence === 'high' ? 'your brand color' : 'a color candidate'}. Adjust if needed.`
                  : 'Enter your brand color and logo URL manually.'}
              </p>
            </div>

            {/* Confidence badge */}
            {extracted && !extracted.fetchError && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999, alignSelf: 'flex-start',
                background: extracted.confidence === 'high' ? '#D1FAE5' : extracted.confidence === 'medium' ? '#FEF3C7' : '#FEF2F2',
                color: extracted.confidence === 'high' ? '#065F46' : extracted.confidence === 'medium' ? '#92400E' : '#7F1D1D',
              }}>
                {extracted.confidence === 'high' ? <Check size={11} aria-hidden /> : '⚠'}
                {extracted.confidence === 'high' ? 'High confidence' : extracted.confidence === 'medium' ? 'Medium — review recommended' : 'Low confidence — manual selection recommended'}
              </div>
            )}

            {/* Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>Primary color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={valid ? color : '#4B5563'} onChange={e => setColor(e.target.value.toUpperCase())}
                  style={{ width: 40, height: 40, border: '1px solid #E8E8E8', borderRadius: 6, padding: 3, cursor: 'pointer', background: 'none' }} />
                <input type="text" value={color} onChange={e => setColor(e.target.value.toUpperCase())} placeholder="#4B5563"
                  style={{ width: 110, height: 40, padding: '0 10px', border: '1px solid #E8E8E8', borderRadius: 6, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
              </div>
              {/* Swatches */}
              {extracted?.suggestedColors && extracted.suggestedColors.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#6B6B6B' }}>Suggestions:</span>
                  {[extracted.primaryColor, ...extracted.suggestedColors].map(c => (
                    <button key={c} onClick={() => setColor(c)} title={c}
                      style={{ width: 26, height: 26, borderRadius: 5, background: c, border: color === c ? '2px solid #111' : '2px solid transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.18)', cursor: 'pointer', padding: 0 }}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>Logo URL</label>
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://yourbusiness.com/logo.svg"
                style={{ height: 40, padding: '0 12px', border: '1px solid #E8E8E8', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                {logoUrl ? 'Logo URL set.' : 'No logo found. Paste a direct URL to your logo, or leave empty to show your business name.'}
              </span>
            </div>

            {/* Mini preview */}
            <div style={{ padding: 12, background: '#F5F5F5', borderRadius: 8, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 10, color: '#6B6B6B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, background: accent, color: textOnColor(accent) }}>
                  Confirm
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 5, fontSize: 12, border: `2px solid ${accent}22`, color: '#111', background: '#FFF' }}>
                  Overview
                  <span style={{ display: 'inline-block', marginLeft: 6, width: 6, height: 6, borderRadius: '50%', background: accent }} />
                </div>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${accent}22`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: accent }}>AB</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('confirm')} disabled={!valid}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: accent, color: accentText, border: 'none', cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.5 }}>
                Continue <ArrowRight size={14} aria-hidden />
              </button>
              <button onClick={() => setStep('website')}
                style={{ padding: '10px 12px', borderRadius: 6, fontSize: 13, color: '#6B6B6B', background: 'none', border: 'none', cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Confirm ──────────────────────────────────── */}
        {step === 'confirm' && (
          <div style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#111' }}>Confirm and save</h2>
              <p style={{ fontSize: 13, color: '#6B6B6B', margin: 0 }}>This will apply your branding to the dashboard immediately.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: '1px solid #E8E8E8', background: '#F9F9F9' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: color, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>Primary color</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', fontFamily: 'monospace' }}>{color}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: '1px solid #E8E8E8', background: '#F9F9F9' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#F5F5F5', border: '1px solid #E8E8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#6B6B6B' }}>
                  {logoUrl ? '✓' : '—'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>Logo</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', wordBreak: 'break-all' }}>{logoUrl || 'Business name (no logo)'}</div>
                </div>
              </div>
            </div>
            {extractError && (
              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#FEF2F2', color: '#7F1D1D', fontSize: 13 }}>{extractError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} disabled={pending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: accent, color: accentText, border: 'none', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1 }}>
                {pending ? 'Saving…' : <>Save & go to dashboard <ArrowRight size={14} aria-hidden /></>}
              </button>
              <button onClick={() => setStep('branding')} style={{ padding: '10px 12px', borderRadius: 6, fontSize: 13, color: '#6B6B6B', background: 'none', border: 'none', cursor: 'pointer' }}>Back</button>
            </div>
          </div>
        )}

        {/* ── Step: Done ─────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={26} color={accentText} aria-hidden />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#111' }}>You're all set</h2>
              <p style={{ fontSize: 13, color: '#6B6B6B', margin: 0 }}>Your dashboard is branded and ready.</p>
            </div>
            <button
              onClick={() => router.push(`/admin/${params.businessId}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: accent, color: accentText, border: 'none', cursor: 'pointer' }}
            >
              Open dashboard <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
