import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getUserByUsername, updatePasswordHash } from "@/lib/db/queries/users";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import { validateCsrf } from "@/lib/auth/csrf";
import { invalidateUserSessions, getSessionToken } from "@/lib/auth/session";

const Schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(1).max(200),
});

export async function PATCH(req: NextRequest) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const username = headersList.get("x-username");
  if (!userId || !username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const body = Schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const pwError = validatePasswordStrength(body.data.new_password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const valid = await verifyPassword(body.data.current_password, user.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const newHash = await hashPassword(body.data.new_password);
  await updatePasswordHash(userId, newHash);

  // Keep the current session alive, invalidate all others
  const currentToken = await getSessionToken();
  await invalidateUserSessions(userId, currentToken ?? undefined);

  return NextResponse.json({ ok: true });
}
