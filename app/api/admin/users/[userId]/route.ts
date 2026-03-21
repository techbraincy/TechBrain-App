import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { deleteUser } from "@/lib/db/queries/users";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

/**
 * DELETE /api/admin/users/[userId]
 * Deletes a user. A superadmin cannot delete their own account.
 */
export async function DELETE(
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

  if (userId === actorId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  try {
    await deleteUser(userId);
  } catch {
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }

  writeAuditLog(actorId, "delete_user", "user", userId);

  return NextResponse.json({ ok: true });
}
