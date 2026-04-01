/**
 * Next.js 16 Proxy — runs before every matched request.
 * (Previously called "middleware" — renamed to "proxy" in Next.js 16.)
 *
 * Responsibilities:
 * 1. Read the session_token cookie.
 * 2. Validate it against the Supabase sessions table.
 * 3. Redirect unauthenticated users to /login.
 * 4. Block non-superadmin users from /admin/* routes.
 * 5. Attach x-user-id and x-user-role headers for downstream use.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "session_token";

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/auth/")) return true; // login/logout handle themselves
  return false;
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass public paths through immediately
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  // Validate session in the database
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      user_id,
      expires_at,
      users ( id, role )
    `
    )
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    // Invalid or expired session — clear cookie and redirect
    const response = redirectToLogin(req);
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  const user = Array.isArray(data.users) ? data.users[0] : data.users;
  if (!user) {
    return redirectToLogin(req);
  }

  // Superadmin guard for /admin/* and /api/admin/*
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminPath && user.role !== "superadmin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Attach user info to request headers so Server Components and
  // Route Handlers can access them without another DB query.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-role", user.role as string);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL("/login", req.url);
  // Preserve the original path so we can redirect back after login
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match everything EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
