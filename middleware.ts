import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible without authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/verify',
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
  // The base response. Reassigned by setAll() whenever Supabase rotates
  // the auth cookie so the refreshed token reaches the browser.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // CRITICAL: do not put any logic between createServerClient and getUser().
  // getUser() validates the access token against the auth server and refreshes
  // it via the refresh token if needed. Any code between the two can corrupt
  // the cookie roundtrip and randomly log users out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  // Unauthenticated → redirect to login (except on public routes)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return copyAuthCookies(NextResponse.redirect(loginUrl), supabaseResponse)
  }

  // Authenticated → redirect away from login/register pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return copyAuthCookies(
      NextResponse.redirect(new URL('/dashboard', request.url)),
      supabaseResponse,
    )
  }

  // Pass-through. Returning supabaseResponse preserves any cookies that
  // getUser() may have rotated.
  return supabaseResponse
}

/**
 * Copy refreshed Supabase auth cookies from `from` onto `to`.
 *
 * When middleware needs to redirect, the redirect response is a fresh object
 * that does NOT carry the cookies set on the working response. If Supabase
 * rotated the access/refresh tokens during getUser(), those rotated cookies
 * MUST be propagated onto the redirect — otherwise the browser keeps stale
 * tokens and the next request will look unauthenticated, producing a loop.
 */
function copyAuthCookies(to: NextResponse, from: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, cookie)
  })
  return to
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
