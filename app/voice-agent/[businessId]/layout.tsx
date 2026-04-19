import { requireBusinessAccess } from '@/lib/auth/session'
import { Sidebar } from '@/components/layouts/sidebar'

interface Props {
  children: React.ReactNode
  params: { businessId: string }
}

export default async function BusinessLayout({ children, params }: Props) {
  const { session, business } = await requireBusinessAccess(params.businessId)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar business={business} user={session.user} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Setup failed banner */}
          {business.setup_status === 'failed' && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
              <p className="text-sm text-amber-800">
                <strong>Ο AI agent δεν ρυθμίστηκε αυτόματα.</strong>{' '}
                Πηγαίνετε στην ενότητα{' '}
                <a href={`/voice-agent/${params.businessId}/agent`} className="underline font-medium">
                  AI Agent
                </a>{' '}
                για να δοκιμάσετε ξανά.
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
