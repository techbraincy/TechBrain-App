import { NextRequest, NextResponse } from "next/server";
import { validateCsrf } from "@/lib/auth/csrf";
import { destroySession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
