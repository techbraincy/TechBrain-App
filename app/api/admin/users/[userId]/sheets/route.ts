import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import {
  getAssignmentsByUserId,
  assignSheetToUser,
} from "@/lib/db/queries/sheets";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

const AssignSchema = z.object({
  sheet_id: z.string().uuid(),
});

/**
 * GET /api/admin/users/[userId]/sheets
 * Returns sheets assigned to a specific user.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const headersList = await headers();
  if (headersList.get("x-user-role") !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignments = await getAssignmentsByUserId(userId);
  return NextResponse.json({ assignments });
}

/**
 * POST /api/admin/users/[userId]/sheets
 * Assigns a sheet to a user.
 */
export async function POST(
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

  let body: z.infer<typeof AssignSchema>;
  try {
    body = AssignSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    await assignSheetToUser(userId, body.sheet_id, actorId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "Sheet is already assigned to this user." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to assign sheet." }, { status: 500 });
  }

  writeAuditLog(actorId, "assign_sheet", "assignment", undefined, {
    user_id: userId,
    sheet_id: body.sheet_id,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
