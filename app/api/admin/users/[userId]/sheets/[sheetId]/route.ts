import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { removeSheetFromUser } from "@/lib/db/queries/sheets";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

/**
 * DELETE /api/admin/users/[userId]/sheets/[sheetId]
 * Removes a sheet assignment from a user.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; sheetId: string }> }
) {
  const { userId, sheetId } = await params;
  const headersList = await headers();
  const actorId = headersList.get("x-user-id");
  if (headersList.get("x-user-role") !== "superadmin" || !actorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  try {
    await removeSheetFromUser(userId, sheetId);
  } catch {
    return NextResponse.json({ error: "Failed to remove assignment." }, { status: 500 });
  }

  writeAuditLog(actorId, "remove_sheet_assignment", "assignment", undefined, {
    user_id: userId,
    sheet_id: sheetId,
  });

  return NextResponse.json({ ok: true });
}
