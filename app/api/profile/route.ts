import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const h = await headers();
  const userId   = h.get("x-user-id");
  const username = h.get("x-username");
  const role     = h.get("x-user-role");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ username, role });
}
