/**
 * CSRF protection using the Double-Submit Cookie Pattern.
 *
 * Flow:
 * 1. Server generates a signed CSRF token and stores it in a
 *    non-httpOnly cookie named `csrf`.
 * 2. Client reads the cookie and includes it in the
 *    X-CSRF-Token header on every mutation (POST/PATCH/DELETE).
 * 3. Server validates that header === cookie.
 *
 * Note: SameSite=Strict on the session cookie already blocks most
 * CSRF vectors. This is defense-in-depth.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf";
const CSRF_HEADER = "x-csrf-token";

function sign(token: string): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) throw new Error("CSRF_SECRET env var is not set");
  return createHmac("sha256", secret).update(token).digest("hex");
}

/**
 * Generate a CSRF token and set it in a readable (non-httpOnly) cookie.
 * Call this when rendering the login page or any form page.
 */
export async function setCsrfCookie(): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const signed = `${raw}.${sign(raw)}`;
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, signed, {
    httpOnly: false, // must be readable by JS to set the header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  return signed;
}

/**
 * Validate the CSRF token from the request.
 * Reads the cookie value and compares it against the header value.
 * Returns true if valid, false otherwise.
 */
export async function validateCsrf(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_COOKIE)?.value;
  const headerValue = request.headers.get(CSRF_HEADER);

  if (!cookieValue || !headerValue) return false;

  try {
    // Timing-safe comparison to prevent timing attacks
    const a = Buffer.from(cookieValue);
    const b = Buffer.from(headerValue);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
