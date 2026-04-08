import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { deleteTenant } from "@/lib/db/queries/tenants";
import { validateCsrf } from "@/lib/auth/csrf";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const h = await headers();
  if (h.get("x-user-role") !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await validateCsrf(req))) return NextResponse.json({ error: "Invalid request." }, { status: 403 });

  const { tenantId } = await params;
  try {
    await deleteTenant(tenantId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
