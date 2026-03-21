import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  createSession as dbCreateSession,
  getSessionByToken,
  deleteSessionByToken,
  deleteSessionsByUserId,
} from "@/lib/db/queries/sessions";
import type { SessionWithUser } from "@/types/db";

const COOKIE_NAME = "session_token";
const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS ?? "8", 10);

// ─────────────────────────────────────────────
// Cookie helpers
// ─────────────────────────────────────────────

function getSessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAge ?? SESSION_TTL_HOURS * 60 * 60,
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Create a new session for a user, set the cookie.
 */
export async function createSession(
  userId: string,
  request: { ip?: string; userAgent?: string }
): Promise<void> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await dbCreateSession(userId, token, expiresAt, request.ip, request.userAgent);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, getSessionCookieOptions());
}

/**
 * Read the session token from the current request cookie.
 * Returns null if missing or expired.
 */
export async function getCurrentSession(): Promise<SessionWithUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionByToken(token);
}

/**
 * Read the raw session token string from the cookie (for middleware use).
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Destroy the current session: delete from DB + clear cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await deleteSessionByToken(token);
  }
  cookieStore.set(COOKIE_NAME, "", { ...getSessionCookieOptions(0), maxAge: 0 });
}

/**
 * Invalidate all sessions for a user (used when admin resets their password).
 * Pass exceptToken to keep the caller's own session alive.
 */
export async function invalidateUserSessions(
  userId: string,
  exceptToken?: string
): Promise<void> {
  await deleteSessionsByUserId(userId, exceptToken);
}
