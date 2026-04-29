import { requireSession } from '@/lib/auth/session'
import { selectBusiness } from './actions'

export const metadata = { title: 'Select Business — Admin' }

export default async function BusinessSelectPage() {
  // Only requireSession() — no requireAdminSession(), no cookie check, no redirect loop risk.
  const session = await requireSession()

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream, #F5F5F5)',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '40px 32px',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #E8E8E8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#111',
            margin: '0 0 6px',
          }}
        >
          Select a business
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>
          You are a member of multiple businesses. Choose which one to manage.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {session.businesses.map((b) => (
            <li key={b.id}>
              <form action={selectBusiness.bind(null, b.id)}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    background: '#fff',
                    border: '1px solid #E8E8E8',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#111' }}>{b.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#9CA3AF',
                    }}
                  >
                    {b.role}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
