import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { deleteSheet } from "@/lib/db/queries/sheets";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

/**
 * DELETE /api/admin/sheets/[sheetId]
 * Removes a registered sheet. Cascades to user_sheets assignments.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  const { sheetId } = await params;
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
    await deleteSheet(sheetId);
  } catch {
    return NextResponse.json({ error: "Failed to delete sheet." }, { status: 500 });
  }

  writeAuditLog(actorId, "delete_sheet", "sheet", sheetId);

  return NextResponse.json({ ok: true });
}
