/**
 * Next.js 16 Proxy — runs before every matched request.
 *
 * Responsibilities:
 * 1. Read the session_token cookie.
 * 2. Validate it against the Supabase sessions table.
 * 3. Redirect unauthenticated users to /login.
 * 4. Block non-superadmin users from /admin/* routes.
 * 5. Attach x-user-id, x-user-role, x-username, x-account-type headers.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "session_token";

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/webhook/")) return true;
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

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select(`user_id, expires_at, users ( id, role, username, account_type )`)
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
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

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-role", user.role as string);
  requestHeaders.set("x-username", (user as any).username ?? "");
  requestHeaders.set("x-account-type", (user as any).account_type ?? "");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
