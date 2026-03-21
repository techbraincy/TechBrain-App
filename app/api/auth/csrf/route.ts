import { NextResponse } from "next/server";
import { setCsrfCookie } from "@/lib/auth/csrf";

/**
 * GET /api/auth/csrf
 * Returns a CSRF token and sets the csrf cookie.
 * The login page fetches this on mount.
 */
export async function GET() {
  const token = await setCsrfCookie();
  return NextResponse.json({ csrfToken: token });
}
