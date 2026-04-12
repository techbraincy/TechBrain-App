/**
 * POST /api/agent/[businessId]/datetime
 *
 * Returns the current date and time in the business's timezone (default: Europe/Nicosia).
 * Called by the ElevenLabs voice agent when the customer uses a relative date expression
 * (today, tonight, tomorrow, this Saturday, next Friday, etc.).
 *
 * Never called for explicit dates the customer states directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";

type Params = { params: Promise<{ businessId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { businessId } = await params;

  // Look up the business timezone if set (fall back to Cyprus)
  const supabase = getSupabaseServer();
  const { data: biz } = await supabase
    .from("businesses")
    .select("workflow_settings")
    .eq("id", businessId)
    .single();

  const ws = (biz?.workflow_settings ?? {}) as Record<string, unknown>;
  const tz = (ws.timezone as string) || "Europe/Nicosia";

  const now = new Date();

  const toLocale = (opts: Intl.DateTimeFormatOptions) =>
    now.toLocaleString("en-GB", { timeZone: tz, ...opts });

  const current_iso  = now.toLocaleString("sv-SE", { timeZone: tz }).replace(" ", "T") +
    (() => {
      const off = -now.getTimezoneOffset();
      const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
      const m = String(Math.abs(off) % 60).padStart(2, "0");
      const sign = off >= 0 ? "+" : "-";
      // Get the actual offset for the target timezone
      const fmt = new Intl.DateTimeFormat("en", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      });
      const parts = fmt.formatToParts(now);
      const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
      // Parse "GMT+2" or "GMT+02:00"
      const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (match) {
        const s = match[1];
        const hh = match[2].padStart(2, "0");
        const mm = match[3] ?? "00";
        return `${s}${hh}:${mm}`;
      }
      return "+00:00";
    })();

  const current_date = toLocale({
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });

  const current_day = toLocale({ weekday: "long" });
  const current_time = toLocale({ hour: "2-digit", minute: "2-digit", hour12: false });

  return NextResponse.json({
    current_iso:  now.toISOString(),
    current_date,
    current_day,
    current_time,
    timezone: tz,
  });
}
