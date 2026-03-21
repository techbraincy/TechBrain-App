import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAssignedSheetByIdForUser, updateSheetCache } from "@/lib/db/queries/sheets";
import { fetchSheetData } from "@/lib/google/sheets-client";

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * GET /api/sheets/[sheetId]/data
 *
 * Returns the sheet data for a sheet assigned to the current user.
 * Checks the DB cache first; fetches from Google Sheets API if stale.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  const { sheetId } = await params;
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Superadmin can access any sheet; regular users must have an assignment
  let sheet;
  if (userRole === "superadmin") {
    const { getSheetById } = await import("@/lib/db/queries/sheets");
    sheet = await getSheetById(sheetId);
  } else {
    sheet = await getAssignedSheetByIdForUser(sheetId, userId);
  }

  if (!sheet) {
    return NextResponse.json({ error: "Sheet not found or access denied." }, { status: 404 });
  }

  // Return cached data if still fresh
  if (
    sheet.cached_data &&
    sheet.cache_expires_at &&
    new Date(sheet.cache_expires_at) > new Date()
  ) {
    return NextResponse.json(
      { values: sheet.cached_data, cached: true },
      {
        headers: {
          "Cache-Control": `max-age=60, stale-while-revalidate=300`,
        },
      }
    );
  }

  // Fetch fresh data from Google Sheets API
  let values: string[][] | null;
  try {
    values = await fetchSheetData(sheet.spreadsheet_id, sheet.range_notation);
  } catch (err) {
    console.error("[sheets/data] Google Sheets API error:", err);

    // Fall back to stale cache if available
    if (sheet.cached_data) {
      return NextResponse.json(
        { values: sheet.cached_data, cached: true, stale: true },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch sheet data. Please try again later." },
      { status: 502 }
    );
  }

  // Update cache in background (don't await)
  updateSheetCache(sheet.id, values, CACHE_TTL_SECONDS).catch((e) =>
    console.error("[sheets/data] cache update failed:", e)
  );

  return NextResponse.json(
    { values, cached: false },
    {
      headers: {
        "Cache-Control": `max-age=60, stale-while-revalidate=300`,
      },
    }
  );
}
