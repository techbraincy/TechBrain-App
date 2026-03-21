import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { updatePasswordHash } from "@/lib/db/queries/users";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { invalidateUserSessions, getSessionToken } from "@/lib/auth/session";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

const ResetPasswordSchema = z.object({
  new_password: z.string().min(12).max(200),
});

/**
 * PATCH /api/admin/users/[userId]/password
 * Admin resets a user's password and invalidates all their sessions.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const headersList = await headers();
  const actorId = headersList.get("x-user-id");
  if (headersList.get("x-user-role") !== "superadmin" || !actorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  let body: z.infer<typeof ResetPasswordSchema>;
  try {
    body = ResetPasswordSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pwError = validatePasswordStrength(body.new_password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }
  const hash = await hashPassword(body.new_password);

  try {
    await updatePasswordHash(userId, hash);
  } catch {
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }

  // Invalidate all sessions for the target user.
  // If the admin is resetting their own password, keep the current session.
  const currentToken = actorId === userId ? await getSessionToken() : undefined;
  await invalidateUserSessions(userId, currentToken ?? undefined);

  writeAuditLog(actorId, "reset_password", "user", userId);

  return NextResponse.json({ ok: true });
}
