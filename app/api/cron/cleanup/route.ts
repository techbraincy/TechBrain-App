import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredSessions } from "@/lib/db/queries/sessions";

/**
 * GET /api/cron/cleanup
 * Deletes expired sessions from the database.
 *
 * Schedule this via Vercel Cron (vercel.json):
 * {
 *   "crons": [
 *     { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }
 *   ]
 * }
 *
 * Vercel sends the CRON_SECRET in the Authorization header.
 * Set CRON_SECRET in your Vercel environment variables.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await deleteExpiredSessions();
    return NextResponse.json({ ok: true, cleaned: true });
  } catch (e) {
    console.error("[cron/cleanup] failed:", e);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
