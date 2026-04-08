import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { deleteUser } from "@/lib/db/queries/users";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const updateSchema = z.union([
  z.object({ permissions: z.record(z.boolean()).nullable() }),
  z.object({ tenant_id: z.string().uuid().nullable() }),
]);

/**
 * PATCH /api/admin/users/[userId]
 * Updates a user's feature permissions.
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

  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("users").update(body.data).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAuditLog(actorId, "update_user_permissions", "user", userId);
  return NextResponse.json({ ok: true });
}

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
