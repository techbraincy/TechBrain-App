import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByUsername, createUser } from "@/lib/db/queries/users";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { validateCsrf } from "@/lib/auth/csrf";

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be at most 30 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  let body: { username: string; password: string };
  try {
    body = RegisterSchema.parse(await req.json());
  } catch (e: any) {
    const msg = e?.errors?.[0]?.message ?? "Invalid request body.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const pwError = validatePasswordStrength(body.password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const existing = await getUserByUsername(body.username);
  if (existing) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  }

  const hash = await hashPassword(body.password);
  // New accounts start with no feature access — admin grants permissions explicitly
  const user = await createUser(body.username, hash, "user", null, {});

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });

  return NextResponse.json({ ok: true });
}
