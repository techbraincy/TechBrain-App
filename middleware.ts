import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible without authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/api/auth/callback',
]

// Routes that are public by prefix
const PUBLIC_PREFIXES = [
  '/portal/',           // customer-facing order tracking
  '/shop/',             // customer ordering app (auth handled per-page)
  '/s/',                // public slug-based storefront redirects
  '/api/agent/',        // ElevenLabs tool webhooks (verified via header)
  '/api/webhook/',
  '/api/shop/',         // shop API (auth checked server-side per route)
]

export async function middleware(request: NextRequest) {
  const mwStart = Date.now()
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST be called before checking user
  const authStart = Date.now()
  const { data: { user } } = await supabase.auth.getUser()
  const authMs = Date.now() - authStart

  const { pathname } = request.nextUrl

  // Only log admin routes to keep noise low
  if (pathname.startsWith('/admin')) {
    console.log(`[ADMIN_PERF] middleware path=${pathname} auth.getUser=${authMs}ms total=${Date.now() - mwStart}ms`)
  }

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  // Unauthenticated → redirect to login (except public routes)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated → redirect away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
