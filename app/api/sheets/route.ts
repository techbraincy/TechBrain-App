import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSheetsByUserId } from "@/lib/db/queries/sheets";

/**
 * GET /api/sheets
 * Returns the sheets assigned to the currently authenticated user.
 */
export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sheets = await getSheetsByUserId(userId);
  return NextResponse.json({ sheets });
}
