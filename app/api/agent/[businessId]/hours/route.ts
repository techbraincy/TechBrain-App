/**
 * GET /api/agent/[businessId]/hours
 *
 * Called by the ElevenLabs voice agent as a tool to check today's opening hours
 * and whether the business is currently open.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { businessId } = await params;
  const supabase = getSupabaseServer();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("business_name, opening_hours, holiday_hours")
    .eq("id", businessId)
    .single();

  if (error || !business) {
    return NextResponse.json({ success: false, message: "Business not found" }, { status: 404 });
  }

  const now = new Date();
  const todayKey = DAY_NAMES[now.getDay()];
  const todayDate = now.toISOString().split("T")[0];

  const hours = (business.opening_hours ?? {}) as Record<string, { open: string; close: string; closed: boolean } | undefined>;
  const holidays = (business.holiday_hours ?? []) as { date: string; name: string; closed: boolean; open: string | null; close: string | null }[];

  // Check holiday override first
  const holiday = holidays.find((h) => h.date === todayDate);
  if (holiday) {
    const isOpen = !holiday.closed;
    const currentTime = now.toTimeString().slice(0, 5);
    const openNow = isOpen && holiday.open && holiday.close
      ? currentTime >= holiday.open && currentTime <= holiday.close
      : false;

    return NextResponse.json({
      success:   true,
      is_open:   openNow,
      today:     todayKey,
      hours:     holiday.closed ? "Closed" : `${holiday.open} – ${holiday.close}`,
      message:   holiday.closed
        ? `${business.business_name} is closed today (${holiday.name}).`
        : `Today (${holiday.name}) we are open ${holiday.open} – ${holiday.close}. ${openNow ? "We are currently open." : "We are currently closed."}`,
    });
  }

  // Normal schedule
  const todayHours = hours[todayKey];
  if (!todayHours || todayHours.closed) {
    return NextResponse.json({
      success: true,
      is_open: false,
      today:   todayKey,
      hours:   "Closed",
      message: `${business.business_name} is closed today (${todayKey}).`,
    });
  }

  const currentTime = now.toTimeString().slice(0, 5);
  const openNow = currentTime >= todayHours.open && currentTime <= todayHours.close;

  // Build week summary
  const weekLines: string[] = [];
  for (const day of DAY_NAMES) {
    const h = hours[day];
    if (!h) continue;
    weekLines.push(h.closed ? `${day}: Closed` : `${day}: ${h.open} – ${h.close}`);
  }

  return NextResponse.json({
    success:      true,
    is_open:      openNow,
    today:        todayKey,
    hours:        `${todayHours.open} – ${todayHours.close}`,
    current_time: currentTime,
    message:      `Today (${todayKey}) we are open ${todayHours.open} – ${todayHours.close}. ${openNow ? "We are currently open." : "We are currently closed."}`,
    week_schedule: weekLines.join(", "),
  });
}
