import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Returns the current user's id and role.
 * The middleware has already validated the session and attached
 * x-user-id / x-user-role headers, so no DB call is needed here.
 */
export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || !userRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ id: userId, role: userRole });
}
