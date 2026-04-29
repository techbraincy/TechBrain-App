import { requireAdminSession } from '@/lib/auth/admin-session'
import { importBrandingFromUrl } from '@/lib/admin/actions'
import { BrandingPreview } from '@/components/admin/BrandingPreview'

interface Props {
  searchParams: { url?: string; onboarding?: string }
}

export default async function BrandingPage({ searchParams }: Props) {
  const { business } = await requireAdminSession()

  let extracted: Awaited<ReturnType<typeof importBrandingFromUrl>> | null = null
  if (searchParams.url) {
    extracted = await importBrandingFromUrl(searchParams.url)
  }

  const isOnboarding = searchParams.onboarding === '1'

  return (
    <div className="fade-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <header>
        <h1 className="heading-display" style={{ fontSize: 28, margin: 0 }}>
          {isOnboarding ? 'Set up your branding' : 'Branding'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ash)', marginTop: 6 }}>
          {isOnboarding
            ? 'Import your brand colors and logo from your website. Review and approve before saving.'
            : 'Import brand colors and logo from your website, then approve before saving.'}
        </p>
      </header>

      <BrandingPreview
        businessName={business.name}
        currentColor={business.primary_color ?? null}
        currentLogo={business.logo_url ?? null}
        extracted={extracted}
        isOnboarding={isOnboarding}
      />
    </div>
  )
}
