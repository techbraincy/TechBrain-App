import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getAllSheets, createSheet } from "@/lib/db/queries/sheets";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

const CreateSheetSchema = z.object({
  spreadsheet_id: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid spreadsheet ID format"),
  display_name: z.string().min(1).max(100),
  range_notation: z.string().min(1).max(200).default("Sheet1"),
});

/**
 * GET /api/admin/sheets
 * Returns all registered sheets.
 */
export async function GET() {
  const headersList = await headers();
  if (headersList.get("x-user-role") !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheets = await getAllSheets();
  return NextResponse.json({ sheets });
}

/**
 * POST /api/admin/sheets
 * Registers a new Google Sheet.
 */
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const actorId = headersList.get("x-user-id");
  if (headersList.get("x-user-role") !== "superadmin" || !actorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  let body: z.infer<typeof CreateSheetSchema>;
  try {
    body = CreateSheetSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let sheet;
  try {
    sheet = await createSheet(
      body.spreadsheet_id,
      body.display_name,
      body.range_notation,
      actorId
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "A sheet with this spreadsheet ID already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create sheet." }, { status: 500 });
  }

  writeAuditLog(actorId, "create_sheet", "sheet", sheet.id, {
    spreadsheet_id: sheet.spreadsheet_id,
    display_name: sheet.display_name,
  });

  return NextResponse.json({ sheet }, { status: 201 });
}
