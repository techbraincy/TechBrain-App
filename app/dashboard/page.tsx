import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'

/**
 * /dashboard — smart redirect based on how many businesses the user belongs to.
 * One business → go directly to that business dashboard.
 * Multiple → show a business selector (to be built in Phase 9).
 * Zero → onboarding.
 */
export default async function DashboardPage() {
  const session = await requireSession()

  if (session.businesses.length === 0) {
    redirect('/onboarding')
  }

  if (session.businesses.length === 1) {
    redirect(`/voice-agent/${session.businesses[0].id}`)
  }

  // Multiple businesses — render selector
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Select a business</h1>
        <p className="text-muted-foreground text-sm">
          You are a member of multiple businesses. Choose which one to open.
        </p>
        <ul className="space-y-2">
          {session.businesses.map((b) => (
            <li key={b.id}>
              <a
                href={`/voice-agent/${b.id}`}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <span className="flex-1">{b.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{b.role}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
